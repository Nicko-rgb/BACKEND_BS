import { Op } from 'sequelize';
import type { CreationAttributes, InferAttributes, Transaction } from 'sequelize';
import { SaaSSubscription, SaaSSubscriptionCompany } from '../database/models';

export const findCompanyMemberships = async (companyIds: number[]) => {
    if (companyIds.length === 0) return [];
    return SaaSSubscriptionCompany.findAll({
        where: { company_id: { [Op.in]: companyIds } },
        attributes: ['company_id', 'is_primary'],
    });
};

// Forma resumida del plan/suscripción de una empresa — usada en el listado de companys y en la
// validación de límites de plan (planLimits.service.ts). Los `max*` van en su unidad cruda
// (número), no formateados — quien los use decide cómo mostrarlos ("∞" a partir de 999, ver
// convención del frontend en RegisterCompany.tsx).
export interface CompanyPlanSummary {
    subscriptionId: number;
    status: string;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    allowsMultiCompany: boolean;
    hasAdvancedReports: boolean;
    hasStripeConnect: boolean;
    planId: number;
    planPublicId: string;
    planName: string;
    planCode: string;
    maxSubsidiaries: number;
    maxSpaces: number;
    maxUsers: number;
    maxInvoicesMonthly: number;
    notificationsTier: string;
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
 * Cada empresa tiene un único vínculo, protegido por índice único.
 */
export const findPlansByCompanyIds = async (companyIds: number[], transaction?: Transaction): Promise<Record<number, CompanyPlanSummary>> => {
    const result: Record<number, CompanyPlanSummary> = {};
    if (companyIds.length === 0) return result;

    const rows = await SaaSSubscriptionCompany.findAll({
        where: { company_id: { [Op.in]: companyIds } },
        include: [{ association: 'subscription', include: [{ association: 'plan' }] }],
        transaction,
    });

    rows.forEach((row) => {
        const subscription = row.subscription;
        const plan = subscription?.plan;
        if (!subscription || !plan) return;

        result[row.company_id] = {
            subscriptionId: subscription.subscription_id,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            allowsMultiCompany: plan.allows_multi_company,
            hasAdvancedReports: plan.has_advanced_reports,
            hasStripeConnect: plan.has_stripe_connect,
            planId: plan.plan_id,
            planPublicId: plan.public_id,
            planName: plan.name,
            planCode: plan.code,
            maxSubsidiaries: plan.max_subsidiaries,
            maxSpaces: plan.max_spaces,
            maxUsers: plan.max_users,
            maxInvoicesMonthly: plan.max_invoices_monthly,
            notificationsTier: plan.notifications_tier,
        };
    });

    return result;
};

// Plan/suscripción de una sola empresa, para no repetir el join en cada lugar que solo
// necesita una empresa puntual (ej. planLimits.service.ts).
export const findPlanByCompanyId = async (companyId: number, transaction?: Transaction): Promise<CompanyPlanSummary | null> => {
    const result = await findPlansByCompanyIds([companyId], transaction);
    return result[companyId] ?? null;
};

// Empresa titular de una suscripción. Los identificadores internos se filtran en el DTO.
export const findPrimaryCompany = async (subscriptionId: number, transaction?: Transaction) => {
    const row = await SaaSSubscriptionCompany.findOne({
        where: { subscription_id: subscriptionId, is_primary: true },
        include: [{ association: 'company', attributes: ['company_id', 'public_id', 'name', 'tenant_id', 'parent_company_id'] }],
        transaction,
    });

    return row?.company ?? null;
};

// Crea la suscripción dentro de una transacción — usado por el alta de empresa.
export const create = async (data: CreationAttributes<SaaSSubscription>, transaction: Transaction) => {
    return SaaSSubscription.create(data, { transaction });
};

// El caller debe indicar si es titular o hermana; nunca promover una hermana por defecto.
export const linkToCompany = async (subscriptionId: number, companyId: number, isPrimary: boolean, transaction: Transaction) => {
    return SaaSSubscriptionCompany.create({ subscription_id: subscriptionId, company_id: companyId, is_primary: isPrimary }, { transaction });
};

export const lockById = async (subscriptionId: number, transaction: Transaction) => {
    return SaaSSubscription.findByPk(subscriptionId, { transaction, lock: transaction.LOCK.UPDATE });
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
