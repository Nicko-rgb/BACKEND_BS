import type { SaaSSubscription, SaaSPlan } from '../database/models';
import type { Company } from '../../companys/database/models';

/**
 * Plan embebido en la suscripción. Se exponen solo los campos que el panel usa para
 * mostrar el plan y sus límites — los ids de pasarela (`mp_plan_id_*`) son internos.
 */
const toSubscriptionPlanDto = (plan: SaaSPlan) => ({
    publicId: plan.public_id,
    name: plan.name,
    code: plan.code,
    priceMonthly: plan.price_monthly,
    priceYearly: plan.price_yearly,
    maxSubsidiaries: plan.max_subsidiaries,
    maxSpaces: plan.max_spaces,
    maxUsers: plan.max_users,
    maxInvoicesMonthly: plan.max_invoices_monthly,
    notificationsTier: plan.notifications_tier,
    allowsMultiCompany: plan.allows_multi_company,
    hasAdvancedReports: plan.has_advanced_reports,
    hasStripeConnect: plan.has_stripe_connect,
    features: plan.features,
});

/**
 * Suscripción tal como la consume el panel. Nunca expone los identificadores internos de
 * la pasarela (`stripe_customer_id`, `stripe_subscription_id`, `mp_preapproval_id`,
 * `mp_payer_email`): son datos operativos del backend, no del usuario.
 */
export const toSubscriptionDto = (subscription: SaaSSubscription, primaryCompany: Company | null) => ({
    publicId: subscription.public_id,
    status: subscription.status,
    isEffective: subscription.is_effective === true,
    plan: subscription.plan ? toSubscriptionPlanDto(subscription.plan) : null,
    billingPeriod: subscription.billing_period,
    gateway: subscription.gateway,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    // Fecha estimada del próximo ciclo; aún no representa una factura emitida.
    nextInvoiceAt: subscription.current_period_end,
    primaryCompany: primaryCompany ? {
        publicId: primaryCompany.public_id,
        name: primaryCompany.name,
    } : null,
    createdAt: subscription.created_at,
    updatedAt: subscription.updated_at,
});
