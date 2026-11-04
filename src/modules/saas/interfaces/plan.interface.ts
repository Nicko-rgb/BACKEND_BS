import type { SubscriptionStatus } from './subscription.interface';

/**
 * Contratos del plan SaaS y sus límites.
 *
 * El vocabulario de cupos vive acá y es la fuente de verdad: el repository, los
 * services de límites y los DTO lo consumen desde este archivo. Los `max*` de
 * `CompanyPlanSummary` van en su unidad cruda (número), no formateados — quien
 * los use decide cómo mostrarlos ("∞" a partir de 999, ver convención del
 * frontend en RegisterCompany.tsx).
 */

// Forma resumida del plan/suscripción de una empresa — usada en el listado de companys y en la
// validación de límites de plan (planLimits.service.ts).
export interface CompanyPlanSummary {
    subscriptionId: number;
    status: SubscriptionStatus;
    isEffective: boolean;
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

// Los 4 límites numéricos que trae un plan — quien registra un recurso limitado
// (sucursal, espacio, usuario, factura) pasa cuál le corresponde a assertPlanLimit.
export type PlanLimitField = 'maxSubsidiaries' | 'maxSpaces' | 'maxUsers' | 'maxInvoicesMonthly';

// Características booleanas que un plan puede incluir o no.
export type PlanFeature = 'allowsMultiCompany' | 'hasAdvancedReports' | 'hasStripeConnect';
import type { SubscriptionStatus } from './subscription.interface';

