import * as CompanyContextRepository from '../repository/companyContext.repository';
import * as CompanyRepository from '../repository/company.repository';
import * as SucursalConfigRepository from '../repository/sucursalConfig.repository';
import { findCompanyMemberships, findPlanByCompanyId } from '../../saas/repository/saasSubscription.repository';
import { hasCompanyScope } from '../../../shared/utils/accessScope';
import { NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { ContextCompanyRecord, ContextSpaceRecord } from '../interfaces/companyContext.interface';
import type {
    CompanyContextCompanyOut,
    CompanyContextPlanOut,
    CompanyContextTreeOut,
} from '../interfaces/companyContext.interface';

/**
 * Árbol empresa → sucursales → espacios con moneda y ventana operativa.
 *
 * Recibe opcionalmente un `publicId` de empresa o sucursal:
 *   - Si se pasa: resuelve a la empresa matriz y devuelve su árbol completo.
 *     El acceso del usuario se refleja en el campo `access` de cada nodo
 *     (true/false), sin bloquear la respuesta con 403.
 *   - Si no se pasa: usa los `company_ids` del usuario y devuelve solo las
 *     empresas a las que tiene acceso.
 *
 * Es la única fuente de verdad del árbol: auth lo consume en el login y
 * el front no arma el árbol por su cuenta.
 *
 * La protección de autenticación vive en el router (`resolveAuthorization()`).
 * Este service nunca tira 403: si el usuario no tiene acceso a una entidad,
 * simplemente devuelve `access: false` en ese nodo.
 */
export const getCompanyContextTree = async (
    user?: Pick<AuthenticatedUser, 'scope_level' | 'company_ids' | 'user_id'> | null,
    publicId?: string,
): Promise<CompanyContextTreeOut> => {
    const effectiveUser = user ?? { scope_level: null, company_ids: [], user_id: 0 };

    // 1. Resolver tenant_id
    let tenantId: string | null = null;

    if (publicId) {
        // ¿Es empresa principal?
        let entity = await CompanyRepository.findByPublicId(publicId);
        if (entity) {
            tenantId = entity.tenant_id;
        } else {
            // ¿Es sucursal?
            const sucursal = await CompanyRepository.findSucursalByPublicId(publicId);
            if (sucursal) {
                tenantId = sucursal.tenant_id;
            }
        }

        if (!tenantId) {
            throw new NotFoundError('Empresa o sucursal no encontrada.');
        }
    } else {
        // Sin publicId: tomar el tenant de la primera empresa del usuario
        if (effectiveUser.company_ids?.length) {
            const rows = await CompanyRepository.findByIds([effectiveUser.company_ids[0]]);
            if (rows?.[0]) {
                tenantId = rows[0].tenant_id;
            }
        }
    }

    if (!tenantId) {
        return {
            companies: [],
            currentPlan: null,
            loadedAt: new Date().toISOString(),
            userPublicId: String(effectiveUser.user_id ?? ''),
        };
    }

    // 2. Qué IDs de empresa usar para traer el árbol: todas las del tenant
    const entities = await CompanyContextRepository.findCompaniesByTenantId(tenantId);
    const sucursales = entities.filter((entity) => entity.parent_company_id !== null);
    const principalEntities = entities.filter((entity) => entity.parent_company_id === null);

    const sucursalIds = sucursales.map((e) => Number(e.company_id));

    const [spaces, configurations] = await Promise.all([
        sucursalIds.length
            ? CompanyContextRepository.findSpaces(sucursalIds)
            : [],
        sucursalIds.length
            ? SucursalConfigRepository.findSchedulesBySucursalIds(sucursalIds)
            : [],
    ]);

    const schedulesBySucursal = new Map<number, { opening_time: string | null; closing_time: string | null }>();
    for (const config of configurations) {
        schedulesBySucursal.set(Number(config.sucursal_id), {
            opening_time: config.opening_time ?? null,
            closing_time: config.closing_time ?? null,
        });
    }

    const spacesBySucursal = new Map<number, ContextSpaceRecord[]>();
    for (const space of spaces) {
        const id = Number(space.sucursal_id);
        const list = spacesBySucursal.get(id) ?? [];
        list.push(space);
        spacesBySucursal.set(id, list);
    }

    // 4. Armar árbol de empresas
    const companiesMap = new Map<number, CompanyContextCompanyOut>();

    const addCompany = (entity: ContextCompanyRecord): CompanyContextCompanyOut => {
        const id = Number(entity.company_id);
        if (!companiesMap.has(id)) {
            companiesMap.set(id, {
                publicId: entity.public_id,
                name: entity.name,
                access: hasCompanyScope(effectiveUser, id),
                isPrimary: false,
                sucursales: [],
            });
        }
        return companiesMap.get(id)!;
    };

    // Empresas principales que están en alcance (o la solicitada por publicId)
    for (const entity of principalEntities) {
        if (publicId || hasCompanyScope(effectiveUser, Number(entity.company_id))) {
            addCompany(entity);
        }
    }

    // Sucursales bajo sus padres
    for (const sucursal of sucursales) {
        const parentId = Number(sucursal.parent_company_id);
        const parent = companiesMap.get(parentId);
        if (!parent) continue;

        const schedule = schedulesBySucursal.get(Number(sucursal.company_id));
        const sucursalSpaces = spacesBySucursal.get(Number(sucursal.company_id)) ?? [];

        parent.sucursales.push({
            publicId: sucursal.public_id,
            name: sucursal.name,
            openTime: schedule?.opening_time ?? null,
            closeTime: schedule?.closing_time ?? null,
            access: hasCompanyScope(effectiveUser, Number(sucursal.company_id)),
            currency: sucursal.country ? {
                code: sucursal.country.iso_currency,
                name: sucursal.country.currency,
                symbol: sucursal.country.currency_simbol,
            } : null,
            spaces: sucursalSpaces.map((space) => ({
                publicId: space.public_id,
                name: space.name,
                access: parent.access,
            })),
        });
    }

    // 5. Marcar isPrimary según membresía de suscripción
    const companyIds = [...companiesMap.keys()];
    const memberships = await findCompanyMemberships(companyIds);
    for (const membership of memberships) {
        const company = companiesMap.get(Number(membership.company_id));
        if (company) company.isPrimary = membership.is_primary;
    }

    // 6. Plan de la empresa primaria (o la primera con acceso)
    let currentPlan: CompanyContextPlanOut | null = null;
    const primaryCompanyId =
        companyIds.find((id) => companiesMap.get(id)!.isPrimary) ?? companyIds[0];

    if (primaryCompanyId !== undefined) {
        const plan = await findPlanByCompanyId(primaryCompanyId);
        if (plan) {
            currentPlan = {
                name: plan.planName,
                code: plan.planCode,
                status: plan.status,
                isEffective: plan.isEffective,
                currentPeriodStart: plan.currentPeriodStart,
                currentPeriodEnd: plan.currentPeriodEnd,
            };
        }
    }

    const companies = [...companiesMap.values()].sort((a, b) =>
        a.name.localeCompare(b.name, 'es') || a.publicId.localeCompare(b.publicId)
    );

    return {
        companies,
        currentPlan,
        loadedAt: new Date().toISOString(),
        userPublicId: String(effectiveUser.user_id ?? ''),
    };
};
