import { isUnlimitedLimit } from '../utils/planLimits';
import type { CompanyPlanSummary } from '../interfaces/plan.interface';
import type { PlanUsageCounts } from '../interfaces/planUsage.interface';
import type { Company } from '../../companys/database/models';

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
