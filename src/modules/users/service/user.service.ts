import type { InferAttributes, Transaction } from 'sequelize';
import * as UserRepository from '../repository/user.repository';
import * as UserCompanyRepository from '../repository/userCompany.repository';
import * as CompanyRepository from '../../companys/repository/company.repository';
import * as CountryRepository from '../../system/repository/country.repository';
import { assertCompanyScope, hasFullCompanyAccess } from '../../../shared/utils/accessScope';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { User } from '../database/models';
import type { ProfileFields } from '../interfaces/user.interface';

export const listByCompany = async (companyPublicId: string, actor: AuthenticatedUser) => {
    const company = await CompanyRepository.findRootIdentityByPublicId(companyPublicId);
    if (!company) throw new NotFoundError('Empresa no encontrada');
    assertCompanyScope(actor, Number(company.company_id), 'No tenés acceso a esta empresa');
    company.subsidiaries = await CompanyRepository.findBranchIdentitiesByParentId(Number(company.company_id), hasFullCompanyAccess(actor) ? undefined : (actor.company_ids ?? []));
    const ids = [Number(company.company_id), ...company.subsidiaries.map((branch) => Number(branch.company_id))];
    const assignments = await UserCompanyRepository.findActiveByCompanyIds(ids);
    const owner = await UserCompanyRepository.findOwnerByTenantId(company.tenant_id);
    if (owner && !assignments.some((row) => Number(row.user_id) === Number(owner.user_id))) assignments.push(owner);
    return { company, assignments };
};

// Usuario con su país y su rol.
export const getById = async (id: number) => {
    const user = await UserRepository.findById(id);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
};

// País existente y habilitado.
export const assertCountryAvailable = async (countryId: number) => {
    const country = await CountryRepository.findById(countryId);
    if (!country) throw new BadRequestError('El país seleccionado no existe.');
    if (!country.is_active) throw new BadRequestError('El país seleccionado no está disponible actualmente.');
};

/**
 * Aplica sobre un usuario ya cargado los cambios de perfil. Todo vive en `dsg_bss_user`.
 * Correo vacío se guarda como null — dos '' chocarían contra el índice único, dos NULL no.
 * `first_name`/`last_name` son NOT NULL: un null explícito se ignora en vez de romper el UPDATE.
 */
export const applyProfileChanges = async (
    user: User,
    data: ProfileFields & Partial<Pick<InferAttributes<User>, 'is_enabled' | 'role_id'>>,
    transaction?: Transaction,
) => {
    const changes: Partial<InferAttributes<User>> = {};

    if (data.first_name != null) changes.first_name = data.first_name;
    if (data.last_name != null) changes.last_name = data.last_name;
    if (data.email !== undefined) changes.email = data.email === '' ? null : data.email;
    if (data.phone !== undefined) changes.phone = data.phone || null;
    if (data.country_id !== undefined) changes.country_id = data.country_id;
    if (data.document_type !== undefined) changes.document_type = data.document_type;
    if (data.document_number !== undefined) changes.document_number = data.document_number || null;
    if (data.date_birth !== undefined) changes.date_birth = data.date_birth || null;
    if (data.is_enabled !== undefined) changes.is_enabled = data.is_enabled;
    if (data.role_id !== undefined) changes.role_id = data.role_id;

    if (changes.email && changes.email !== user.email) {
        const existing = await UserRepository.findByEmail(changes.email);
        if (existing && Number(existing.user_id) !== Number(user.user_id)) {
            throw new ConflictError('Ya existe un usuario registrado con este correo electrónico.');
        }
    }

    if (data.country_id !== undefined) await assertCountryAvailable(data.country_id);

    if (Object.keys(changes).length > 0) {
        await UserRepository.update(user, changes, transaction);
    }
};

// Autoedición del propio perfil — sin rol ni habilitado.
export const updateOwnProfile = async (userId: number, data: ProfileFields) => {
    const user = await getById(userId);
    await applyProfileChanges(user, data);
    return getById(userId);
};
