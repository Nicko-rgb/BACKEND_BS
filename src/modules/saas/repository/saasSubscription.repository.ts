import { Op } from 'sequelize';
import type { CreationAttributes, InferAttributes, Transaction } from 'sequelize';
import { SaaSSubscription, SaaSSubscriptionCompany } from '../database/models';

// Forma resumida del plan/suscripción de una empresa — usada en el listado de companys y en la
// validación de límites de plan (planLimits.service.ts). Los `max*` van en su unidad cruda
// (número), no formateados — quien los use decide cómo mostrarlos ("∞" a partir de 999, ver
// convención del frontend en RegisterCompany.tsx).
export interface CompanyPlanSummary {
    subscriptionId: number;
    status: string;
    planId: number;
    planName: string;
    planCode: string;
    maxSubsidiaries: number;
    maxSpaces: number;
    maxUsers: number;
    maxInvoicesMonthly: number;
}

/**
 * Plan/suscripción que cubre a cada empresa dada — una sola query con JOIN para toda la
 * lista de ids, nunca una por fila. Empresas sin suscripción no aparecen en el resultado
 * (el caller decide qué mostrar en ese caso). Usado por company.service.ts para armar el
 * listado de empresas con su plan.
 *
 * No filtra por `is_primary`: ese flag distingue, DENTRO de una suscripción Multi-Empresa,
 * cuál de las empresas cubiertas es la titular de facturación (a la que apunta
 * SaaSInvoice.company_id) — no identifica "el plan" de una empresa puntual. Filtrar por
 * is_primary=true dejaría sin plan a toda empresa secundaria de un plan Business.
 * Ordenado por created_at DESC: si una empresa llegara a tener más de una fila (ej. una
 * suscripción vieja cancelada y una nueva), se queda con la más reciente.
 */
export const findPlansByCompanyIds = async (companyIds: number[]): Promise<Record<number, CompanyPlanSummary>> => {
    const result: Record<number, CompanyPlanSummary> = {};
    if (companyIds.length === 0) return result;

    const rows = await SaaSSubscriptionCompany.findAll({
        where: { company_id: { [Op.in]: companyIds } },
        include: [{ association: 'subscription', include: [{ association: 'plan' }] }],
        order: [['created_at', 'DESC']],
    });

    rows.forEach((row) => {
        if (result[row.company_id]) return; // ya se quedó con la fila más reciente

        const subscription = row.subscription;
        const plan = subscription?.plan;
        if (!subscription || !plan) return;

        result[row.company_id] = {
            subscriptionId: subscription.subscription_id,
            status: subscription.status,
            planId: plan.plan_id,
            planName: plan.name,
            planCode: plan.code,
            maxSubsidiaries: plan.max_subsidiaries,
            maxSpaces: plan.max_spaces,
            maxUsers: plan.max_users,
            maxInvoicesMonthly: plan.max_invoices_monthly,
        };
    });

    return result;
};

// Plan/suscripción de una sola empresa — mismo criterio que findPlansByCompanyIds (queda la
// más reciente si hubiera más de una fila), para no repetir el join en cada lugar que solo
// necesita una empresa puntual (ej. planLimits.service.ts).
export const findPlanByCompanyId = async (companyId: number): Promise<CompanyPlanSummary | null> => {
    const result = await findPlansByCompanyIds([companyId]);
    return result[companyId] ?? null;
};

// Empresa titular (is_primary) de una suscripción — solo su id, tenant y nombre.
export const findPrimaryCompany = async (subscriptionId: number) => {
    const row = await SaaSSubscriptionCompany.findOne({
        where: { subscription_id: subscriptionId, is_primary: true },
        include: [{ association: 'company', attributes: ['company_id', 'tenant_id', 'name'] }],
    });

    return row?.company ?? null;
};

// Crea la suscripción dentro de una transacción — usado por el alta de empresa.
export const create = async (data: CreationAttributes<SaaSSubscription>, transaction: Transaction) => {
    return SaaSSubscription.create(data, { transaction });
};

// Vincula la suscripción a la empresa que cubre (tabla puente) — la empresa recién creada
// siempre es la titular (`is_primary: true`) de su propia suscripción.
export const linkToCompany = async (subscriptionId: number, companyId: number, transaction: Transaction) => {
    return SaaSSubscriptionCompany.create({ subscription_id: subscriptionId, company_id: companyId, is_primary: true }, { transaction });
};

// Actualiza parcialmente la instancia ya cargada — usado por el webhook de MercadoPago para
// activar la suscripción (o por cualquier otro flujo que ya tenga la fila en mano).
export const update = async (subscription: SaaSSubscription, data: Partial<InferAttributes<SaaSSubscription>>, transaction?: Transaction) => {
    return subscription.update(data, { transaction });
};

/**
 * Suscripción PENDING por su Preapproval de MercadoPago, con la empresa que cubre (vía la
 * tabla puente) — usada por el webhook para saber qué empresa activar cuando MercadoPago
 * confirma la autorización. Solo trae PENDING: una vez activada, un reenvío del mismo
 * webhook no la vuelve a encontrar y el evento se ignora (idempotencia).
 */
export const findPendingByPreapprovalId = async (preapprovalId: string) => {
    return SaaSSubscription.findOne({
        where: { mp_preapproval_id: preapprovalId, status: 'PENDING' },
        include: [{ association: 'subscriptionCompanies' }],
    });
};
