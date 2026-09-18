import bcrypt from 'bcryptjs';
import type { InferAttributes } from 'sequelize';
import sequelize from '../../../config/db';
import * as UserRepository from '../repository/user.repository';
import * as UserCompanyRepository from '../repository/userCompany.repository';
import * as RoleRepository from '../../system/repository/role.repository';
import * as CompanyRepository from '../../companys/repository/company.repository';
import * as PlanLimitsService from '../../saas/service/planLimits.service';
import { applyProfileChanges, assertCountryAvailable } from './user.service';
import { canAssignRole, isManagedRole } from '../../../shared/utils/roleHierarchy';
import { hasFullCompanyAccess } from '../../../shared/utils/accessScope';
import { invalidateUserAuthCache } from '../../../shared/utils/authorizationCache';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/CustomErrors';
import type { ManagedRole } from '../../../shared/utils/roleHierarchy';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { PaginationQuery } from '../../../shared/types/pagination';
import type { Person, User } from '../database/models';
import type { ManagedAssignment } from '../dto/userManage.dto';

export interface ListUsersQuery extends PaginationQuery {
    search?: string;
    role?: string;
    countryId?: number;
}

type ManagedProfileInput = Partial<Pick<InferAttributes<User>, 'first_name' | 'last_name' | 'email' | 'is_enabled'>>
    & Partial<Pick<InferAttributes<Person>, 'phone' | 'country_id' | 'document_type' | 'document_number' | 'date_birth'>>;

export type CreateManagedUserInput = ManagedProfileInput & {
    password?: string | null;
    sucursales?: string[];
    company_tenant_id?: string;
};

export type UpdateManagedUserInput = ManagedProfileInput & {
    role?: string;
    sucursales?: string[];
};

interface CompanyAssignment {
    company_id: number;
    tenant_id: string;
    root_company_id: number;
}

// Roles asignados a sucursales — los únicos entre los que se puede cambiar el rol al editar.
const SUCURSAL_ROLES: readonly string[] = ['administrador', 'empleado'];

// ── Reglas ──────────────────────────────────────────────────────────────────────────────────

const resolveRole = (value: string): ManagedRole => {
    if (!isManagedRole(value)) throw new NotFoundError('Recurso no encontrado');
    return value;
};

const inScope = (user: AuthenticatedUser, companyId: number) =>
    hasFullCompanyAccess(user) || (user.company_ids ?? []).includes(companyId);

// Sucursales a asignar — todas deben existir y estar dentro del alcance del usuario. La
// asignación guarda el tenant_id de la empresa raíz.
const resolveSucursalAssignments = async (user: AuthenticatedUser, tenantIds: string[]): Promise<CompanyAssignment[]> => {
    const sucursales = await CompanyRepository.findSucursalesByTenantIds(tenantIds);
    if (sucursales.length !== tenantIds.length) {
        throw new BadRequestError('Alguna de las sucursales seleccionadas no existe.');
    }
    if (sucursales.some((sucursal) => !inScope(user, Number(sucursal.company_id)))) {
        throw new ForbiddenError('No tenés acceso a alguna de las sucursales seleccionadas');
    }

    return sucursales.map((sucursal) => ({
        company_id: Number(sucursal.company_id),
        tenant_id: sucursal.parentCompany!.tenant_id,
        root_company_id: Number(sucursal.parentCompany!.company_id),
    }));
};

// Empresa principal a la que se asigna un super_admin (dueño).
const resolveOwnerAssignment = async (user: AuthenticatedUser, tenantId: string): Promise<CompanyAssignment[]> => {
    const company = await CompanyRepository.findByTenantId(tenantId);
    if (!company) throw new NotFoundError('Empresa no encontrada');
    if (!inScope(user, Number(company.company_id))) throw new ForbiddenError('No tenés acceso a esta empresa');

    return [{ company_id: Number(company.company_id), tenant_id: company.tenant_id, root_company_id: Number(company.company_id) }];
};

/**
 * Cupo de usuarios del plan en cada empresa raíz a la que se suma el usuario: cuenta los usuarios
 * distintos de la empresa y sus sucursales, dueño incluido. Si ya pertenece a esa empresa, no suma.
 */
const assertUserLimit = async (assignments: CompanyAssignment[], existingUserId?: number) => {
    const currentCompanyIds = existingUserId ? await UserCompanyRepository.findActiveCompanyIdsByUserId(existingUserId) : [];

    for (const rootId of new Set(assignments.map((assignment) => assignment.root_company_id))) {
        const companyIds = [rootId, ...await CompanyRepository.findSucursalIdsByParentIds([rootId])];
        if (companyIds.some((companyId) => currentCompanyIds.includes(companyId))) continue;

        const currentUsers = await UserCompanyRepository.countActiveUsersByCompanyIds(companyIds);
        await PlanLimitsService.assertPlanLimit(rootId, 'maxUsers', currentUsers);
    }
};

// Alcance sobre un usuario existente — por sus asignaciones de empresa/sucursal; un cliente, por
// las empresas (y sus sucursales) de quien lo registró.
const assertTargetInScope = async (user: AuthenticatedUser, role: ManagedRole, target: User) => {
    if (hasFullCompanyAccess(user)) return;

    let targetCompanyIds: number[] = [];
    if (role === 'cliente') {
        if (target.user_create) {
            const creatorIds = await UserCompanyRepository.findActiveCompanyIdsByUserId(Number(target.user_create));
            const creatorSucursalIds = await CompanyRepository.findSucursalIdsByParentIds(creatorIds);
            targetCompanyIds = [...creatorIds, ...creatorSucursalIds];
        }
    } else {
        targetCompanyIds = await UserCompanyRepository.findActiveCompanyIdsByUserId(Number(target.user_id));
    }

    if (!targetCompanyIds.some((companyId) => inScope(user, companyId))) {
        throw new ForbiddenError('No tenés acceso a este usuario');
    }
};

// Usuario objetivo de una lectura/edición — su rol actual debe ser el de la ruta, y el usuario
// autenticado debe poder gestionar ese rol dentro de su alcance.
const loadTarget = async (user: AuthenticatedUser, role: ManagedRole, id: number) => {
    const target = await UserRepository.findById(id);
    if (!target || target.roleRef?.key !== role) throw new NotFoundError('Usuario no encontrado');
    if (!canAssignRole(user, role)) throw new ForbiddenError('No tenés permisos para gestionar este usuario');

    await assertTargetInScope(user, role, target);
    return target;
};

// Asignaciones activas de un usuario visibles para quien consulta, con tenant y nombre.
const loadAssignments = async (user: AuthenticatedUser, userId: number): Promise<ManagedAssignment[]> => {
    const rows = (await UserCompanyRepository.findActiveByUserId(userId))
        .filter((row) => inScope(user, Number(row.company_id)));

    const companies = await CompanyRepository.findByIds(rows.map((row) => Number(row.company_id)));
    const companyById = new Map(companies.map((company) => [Number(company.company_id), company]));

    return rows.flatMap((row) => {
        const company = companyById.get(Number(row.company_id));
        return company ? [{ tenantId: company.tenant_id, name: company.name, role: row.role }] : [];
    });
};

// ── Operaciones ─────────────────────────────────────────────────────────────────────────────

// Catálogo global de usuarios, paginado, con búsqueda por nombre o correo y filtros por rol y país.
export const list = async (query: ListUsersQuery) => {
    const search = query.search?.trim() || undefined;
    const role = query.role?.trim() || undefined;

    return UserRepository.findAll(query, { search, role, countryId: query.countryId });
};

export const getById = async (roleParam: string, id: number, user: AuthenticatedUser) => {
    const role = resolveRole(roleParam);
    const target = await loadTarget(user, role, id);

    return { user: target, assignments: await loadAssignments(user, Number(target.user_id)) };
};

/**
 * Alta de un usuario con el rol de la ruta. Crea User + Person + sus asignaciones (empresa para
 * super_admin, sucursales para administrador/empleado) en una sola transacción.
 */
export const create = async (roleParam: string, data: CreateManagedUserInput, user: AuthenticatedUser) => {
    const role = resolveRole(roleParam);
    if (!canAssignRole(user, role)) throw new ForbiddenError('No tenés permisos para registrar este usuario');

    const roleRow = await RoleRepository.findByKey(role);
    if (!roleRow) throw new ValidationError(`El rol "${role}" no existe`);

    const email = data.email?.trim() || null;
    if (email && await UserRepository.findByEmail(email)) {
        throw new ConflictError('Ya existe un usuario registrado con este correo electrónico.');
    }

    await assertCountryAvailable(data.country_id!);

    let assignments: CompanyAssignment[] = [];
    if (SUCURSAL_ROLES.includes(role)) assignments = await resolveSucursalAssignments(user, data.sucursales ?? []);
    if (role === 'super_admin') assignments = await resolveOwnerAssignment(user, data.company_tenant_id!);
    await assertUserLimit(assignments);

    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;

    const newUserId = await sequelize.transaction(async (transaction) => {
        const newUser = await UserRepository.create({
            first_name: data.first_name!,
            last_name: data.last_name!,
            email,
            password: hashedPassword,
            social_id: null,
            social_provider: null,
            role_id: roleRow.role_id,
            is_enabled: true,
            user_create: user.user_id,
        }, transaction);

        await UserRepository.createPerson({
            user_id: newUser.user_id,
            country_id: data.country_id!,
            date_birth: data.date_birth || null,
            gender: null,
            document_type: data.document_type ?? null,
            document_number: data.document_number || null,
            phone: data.phone || null,
            ubigeo_id: null,
            occupation: null,
            civil_state: null,
            sports_preferences: null,
            accept_marketing: false,
            preferences: null,
            default_payment_type_id: null,
        }, transaction);

        if (assignments.length > 0) {
            await UserCompanyRepository.bulkCreate(assignments.map((assignment) => ({
                user_id: newUser.user_id,
                company_id: assignment.company_id,
                role,
                tenant_id: assignment.tenant_id,
                is_active: true,
                created_by: user.user_id,
            })), transaction);
        }

        return Number(newUser.user_id);
    });

    return getById(role, newUserId, user);
};

/**
 * Edición de un usuario con el rol de la ruta (su rol actual) — nunca contraseña. Un cambio de rol
 * solo se permite entre administrador y empleado; `sucursales` reemplaza sus asignaciones dentro
 * del alcance de quien edita.
 */
export const update = async (roleParam: string, id: number, data: UpdateManagedUserInput, user: AuthenticatedUser) => {
    const role = resolveRole(roleParam);
    const target = await loadTarget(user, role, id);
    const { role: nextRole, sucursales, ...profile } = data;

    let nextRoleId: number | undefined;
    if (nextRole !== undefined && nextRole !== role) {
        if (!SUCURSAL_ROLES.includes(role) || !SUCURSAL_ROLES.includes(nextRole)) {
            throw new ValidationError('Solo se puede cambiar el rol entre administrador y empleado');
        }
        if (!canAssignRole(user, nextRole)) throw new ForbiddenError('No tenés permisos para asignar este rol');

        const roleRow = await RoleRepository.findByKey(nextRole);
        if (!roleRow) throw new ValidationError(`El rol "${nextRole}" no existe`);
        nextRoleId = roleRow.role_id;
    }

    const targetId = Number(target.user_id);
    const assignments = sucursales ? await resolveSucursalAssignments(user, sucursales) : null;
    if (assignments) await assertUserLimit(assignments, targetId);
    const assignedRole = nextRoleId !== undefined ? nextRole! : role;

    await sequelize.transaction(async (transaction) => {
        await applyProfileChanges(target, nextRoleId !== undefined ? { ...profile, role_id: nextRoleId } : profile, transaction);

        if (assignments) {
            const scopeCompanyIds = hasFullCompanyAccess(user) ? undefined : (user.company_ids ?? []);
            await UserCompanyRepository.destroyByUserId(targetId, scopeCompanyIds, transaction);
            await UserCompanyRepository.bulkCreate(assignments.map((assignment) => ({
                user_id: targetId,
                company_id: assignment.company_id,
                role: assignedRole,
                tenant_id: assignment.tenant_id,
                is_active: true,
                created_by: user.user_id,
            })), transaction);
        } else if (nextRoleId !== undefined) {
            await UserCompanyRepository.updateRoleByUserId(targetId, assignedRole, transaction);
        }
    });

    if (assignments || nextRoleId !== undefined || profile.is_enabled !== undefined) {
        await invalidateUserAuthCache(targetId);
    }

    return getById(assignedRole, targetId, user);
};
