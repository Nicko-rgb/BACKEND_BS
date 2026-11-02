import * as CompanyContextRepository from '../repository/companyContext.repository';
import { findCompanyMemberships } from '../../saas/repository/saasSubscription.repository';
import { hasCompanyScope, hasFullCompanyAccess } from '../../../shared/utils/accessScope';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { CompanyContextNode, ContextCompanyRecord, ContextSpaceRecord } from '../interfaces/companyContext.interface';

/**
 * Contexto informativo del login. `access` indica alcance sobre la entidad;
 * los permisos para cada acción siguen siendo responsabilidad del backend.
 * Nunca se incluyen sucursales hermanas fuera del alcance del usuario.
 */
export const getCompanyContext = async (
    user: Pick<AuthenticatedUser, 'scope_level' | 'company_ids'>,
): Promise<CompanyContextNode[]> => {
    const globalAccess = hasFullCompanyAccess(user);
    if (!globalAccess && !user.company_ids?.length) return [];

    const entities = await CompanyContextRepository.findCompanies(globalAccess ? undefined : user.company_ids);
    const sucursales = entities.filter((entity) =>
        entity.parent_company_id !== null && hasCompanyScope(user, entity.company_id));
    const spaces = sucursales.length
        ? await CompanyContextRepository.findSpaces(sucursales.map((entity) => Number(entity.company_id)))
        : [];

    const spacesBySucursal = new Map<number, ContextSpaceRecord[]>();
    for (const space of spaces) {
        const id = Number(space.sucursal_id);
        const list = spacesBySucursal.get(id) ?? [];
        list.push(space);
        spacesBySucursal.set(id, list);
    }

    const companies = new Map<number, CompanyContextNode>();
    const addCompany = (entity: ContextCompanyRecord) => {
        const id = Number(entity.company_id);
        if (!companies.has(id)) {
            companies.set(id, { entity, access: hasCompanyScope(user, id), isPrimary: false, sucursales: [] });
        }
        return companies.get(id)!;
    };

    for (const entity of entities) {
        if (entity.parent_company_id === null && hasCompanyScope(user, entity.company_id)) addCompany(entity);
    }

    for (const sucursal of sucursales) {
        // Incluir la empresa como agrupador no amplía el alcance sobre ella.
        const parent = companies.get(Number(sucursal.parent_company_id))
            ?? (sucursal.parentCompany ? addCompany(sucursal.parentCompany) : undefined);
        if (!parent) continue;
        parent.sucursales.push({
            entity: sucursal,
            access: hasCompanyScope(user, sucursal.company_id),
            spaces: spacesBySucursal.get(Number(sucursal.company_id)) ?? [],
        });
    }

    const memberships = await findCompanyMemberships([...companies.keys()]);
    for (const membership of memberships) {
        const company = companies.get(Number(membership.company_id));
        if (company) company.isPrimary = membership.is_primary;
    }

    // Los padres añadidos desde una sucursal pueden llegar en otro orden.
    return [...companies.values()].sort((a, b) =>
        a.entity.name.localeCompare(b.entity.name, 'es') || a.entity.public_id.localeCompare(b.entity.public_id));
};
