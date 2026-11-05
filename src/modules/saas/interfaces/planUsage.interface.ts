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
