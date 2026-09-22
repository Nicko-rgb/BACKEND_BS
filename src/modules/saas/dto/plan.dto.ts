import type { SaaSPlan } from '../database/models';

export const toPlanDto = (plan: SaaSPlan, referencesCount = 0) => ({
    publicId: plan.public_id,
    name: plan.name,
    code: plan.code,
    priceMonthly: plan.price_monthly,
    priceYearly: plan.price_yearly,
    maxSubsidiaries: plan.max_subsidiaries,
    maxSpaces: plan.max_spaces,
    maxUsers: plan.max_users,
    hasStripeConnect: plan.has_stripe_connect,
    maxInvoicesMonthly: plan.max_invoices_monthly,
    notificationsTier: plan.notifications_tier,
    hasAdvancedReports: plan.has_advanced_reports,
    allowsMultiCompany: plan.allows_multi_company,
    features: plan.features,
    isActive: plan.is_active,
    referencesCount,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
});
