/**
 * Conteos de uso que consume el DTO de cupos. Los arma `planLimits.service.getPlanUsage`
 * con los mismos conteos que valida `assertPlanLimit`, así la barra del panel y el guard
 * de creación nunca pueden discrepar.
 */
export interface PlanUsageCounts {
    subsidiaries: number;
    users: number;
    spaces: number;
    invoicesMonthly: number;
}

export interface PlanUsageCompanyRecord {
    companyId: number;
    publicId: string;
    name: string;
    isPrimary: boolean;
}

export interface PlanUsageBranchRecord {
    companyId: number;
    branchId: number;
    publicId: string;
    name: string;
    spaces: number;
}

export interface CompanyUsageCounts extends PlanUsageCompanyRecord {
    users: number;
    branches: PlanUsageBranchRecord[];
}
