import { QueryTypes } from 'sequelize';
import sequelize from '../../../config/db';
import type { PlanUsageBranchRecord, PlanUsageCompanyRecord } from '../interfaces/planUsage.interface';

export const findCompaniesBySubscriptionId = async (subscriptionId: number): Promise<PlanUsageCompanyRecord[]> =>
    sequelize.query<PlanUsageCompanyRecord>(`
        SELECT c.company_id AS "companyId", c.public_id AS "publicId", c.name,
               sc.is_primary AS "isPrimary"
        FROM dsg_bss_saas_subscription_company sc
        JOIN dsg_bss_company c ON c.company_id = sc.company_id
        WHERE sc.subscription_id = :subscriptionId AND c.parent_company_id IS NULL
        ORDER BY sc.is_primary DESC, c.name, c.public_id
    `, { replacements: { subscriptionId }, type: QueryTypes.SELECT });

export const findBranchUsageByCompanyIds = async (companyIds: number[]): Promise<PlanUsageBranchRecord[]> => {
    if (companyIds.length === 0) return [];

    return sequelize.query<PlanUsageBranchRecord>(`
        SELECT c.parent_company_id AS "companyId", c.company_id AS "branchId",
               c.public_id AS "publicId", c.name, COUNT(s.space_id)::integer AS spaces
        FROM dsg_bss_company c
        LEFT JOIN dsg_bss_space s ON s.sucursal_id = c.company_id
        WHERE c.parent_company_id IN (:companyIds)
        GROUP BY c.company_id, c.parent_company_id, c.public_id, c.name
        ORDER BY c.name, c.public_id
    `, { replacements: { companyIds }, type: QueryTypes.SELECT });
};
