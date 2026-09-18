import * as SaaSSubscriptionRepository from '../repository/saasSubscription.repository';
import * as CompanyRepository from '../../companys/repository/company.repository';
import * as UserCompanyRepository from '../../users/repository/userCompany.repository';
import { isUnlimitedLimit } from '../utils/planLimits';
import { hasFullCompanyAccess } from '../../../shared/utils/accessScope';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { CompanyPlanSummary } from '../repository/saasSubscription.repository';
import type { AuthenticatedUser } from '../../../shared/types/auth';

// Los 4 límites numéricos que trae un plan — quien registra un recurso limitado (sucursal,
// espacio, usuario, factura) pasa cuál le corresponde a assertPlanLimit.
export type PlanLimitField = 'maxSubsidiaries' | 'maxSpaces' | 'maxUsers' | 'maxInvoicesMonthly';

const LIMIT_LABELS: Record<PlanLimitField, string> = {
    maxSubsidiaries: 'sucursales',
    maxSpaces: 'espacios',
    maxUsers: 'usuarios',
    maxInvoicesMonthly: 'facturas por mes',
};

// Plan/suscripción activa de una empresa raíz — reusa el mismo join que ya arma el listado de
// companys (saasSubscription.repository.ts::findPlanByCompanyId), no se resuelve de nuevo acá.
export const getActivePlanForCompany = async (companyId: number): Promise<CompanyPlanSummary | null> => {
    return SaaSSubscriptionRepository.findPlanByCompanyId(companyId);
};

/**
 * Corta con ConflictError si `currentCount` ya alcanzó o superó el límite del plan activo de
 * la empresa para `field` — un paso más en la misma cadena de validaciones que ya hace cada
 * Service de alta (plan activo, documento único, país activo, etc.), reusado acá para no
 * repetir "traer el plan y comparar" en cada lugar que registra algo limitado por plan
 * (sucursales hoy; espacios, usuarios y facturas cuando existan esos altas).
 */
export const assertPlanLimit = async (companyId: number, field: PlanLimitField, currentCount: number): Promise<void> => {
    const plan = await getActivePlanForCompany(companyId);
    if (!plan) throw new NotFoundError('La empresa no tiene un plan activo.');

    const limit = plan[field];
    if (isUnlimitedLimit(limit)) return;
    if (currentCount >= limit) {
        throw new ConflictError(`Esta empresa alcanzó el límite de ${LIMIT_LABELS[field]} de su plan (${plan.planName}: ${limit}).`);
    }
};

/**
 * Plan de una empresa raíz, su empresa primaria (la titular de la suscripción, puede ser ella misma)
 * y lo que ya consume de cada límite, con los mismos conteos que valida assertPlanLimit.
 */
export const getPlanUsage = async (companyId: number, user: AuthenticatedUser) => {
    const company = await CompanyRepository.findRootById(companyId);
    if (!company) throw new NotFoundError('Empresa no encontrada');

    if (!hasFullCompanyAccess(user) && !(user.company_ids ?? []).includes(companyId)) {
        throw new ForbiddenError('No tenés acceso a esta empresa');
    }

    const plan = await getActivePlanForCompany(companyId);
    if (!plan) throw new NotFoundError('La empresa no tiene un plan activo.');

    const primaryCompany = await SaaSSubscriptionRepository.findPrimaryCompany(plan.subscriptionId);
    const sucursalIds = await CompanyRepository.findSucursalIdsByParentIds([companyId]);
    const users = await UserCompanyRepository.countActiveUsersByCompanyIds([companyId, ...sucursalIds]);

    // Espacios y facturas todavía no tienen alta: su uso es 0.
    return { plan, primaryCompany, usage: { subsidiaries: sucursalIds.length, users, spaces: 0, invoicesMonthly: 0 } };
};
