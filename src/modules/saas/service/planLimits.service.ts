import * as SaaSSubscriptionRepository from '../repository/saasSubscription.repository';
import { ConflictError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { CompanyPlanSummary } from '../repository/saasSubscription.repository';

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
    if (currentCount >= limit) {
        throw new ConflictError(`Esta empresa alcanzó el límite de ${LIMIT_LABELS[field]} de su plan (${plan.planName}: ${limit}).`);
    }
};
