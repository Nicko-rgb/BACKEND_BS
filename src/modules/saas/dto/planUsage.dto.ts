import { isUnlimitedLimit } from '../utils/planLimits';
import type { CompanyPlanSummary } from '../interfaces/plan.interface';
import type { CompanyUsageCounts, PlanUsageCounts } from '../interfaces/planUsage.interface';
import type { Company } from '../../companys/database/models';
import type { SaaSSubscription } from '../database/models';
import { toSubscriptionDto } from './subscription.dto';

// Uso de un límite — `max` en null cuando el plan lo tiene ilimitado.
const toLimitUsage = (used: number, max: number) => ({ used, max: isUnlimitedLimit(max) ? null : max });

export const toPlanUsageDto = (plan: CompanyPlanSummary, primaryCompany: Company | null, usage: PlanUsageCounts) => ({
    planName: plan.planName,
    notificationsTier: plan.notificationsTier,
    primaryCompany: primaryCompany ? {
        publicId: primaryCompany.public_id,
        name: primaryCompany.name,
    } : null,
    subsidiaries: toLimitUsage(usage.subsidiaries, plan.maxSubsidiaries),
    users: toLimitUsage(usage.users, plan.maxUsers),
    spaces: toLimitUsage(usage.spaces, plan.maxSpaces),
    invoicesMonthly: toLimitUsage(usage.invoicesMonthly, plan.maxInvoicesMonthly),
});

export const toPlanUsageOverviewDto = (
    company: Company,
    subscription: SaaSSubscription,
    primaryCompany: Company | null,
    companiesCount: number,
    companyUsage: CompanyUsageCounts[],
) => {
    const plan = subscription.plan!;
    return {
        company: { publicId: company.public_id, name: company.name },
        subscription: toSubscriptionDto(subscription, primaryCompany),
        companies: { used: companiesCount, max: plan.allows_multi_company ? null : 1 },
        companyUsage: companyUsage.map((item) => ({
            publicId: item.publicId,
            name: item.name,
            isPrimary: item.isPrimary,
            subsidiaries: toLimitUsage(item.branches.length, plan.max_subsidiaries),
            users: toLimitUsage(item.users, plan.max_users),
            branches: item.branches.map((branch) => ({
                publicId: branch.publicId,
                name: branch.name,
                spaces: toLimitUsage(branch.spaces, plan.max_spaces),
                invoicesMonthly: {
                    used: null,
                    max: isUnlimitedLimit(plan.max_invoices_monthly) ? null : plan.max_invoices_monthly,
                },
            })),
        })),
        invoicesTrackingAvailable: false,
        updatedAt: new Date().toISOString(),
    };
};
