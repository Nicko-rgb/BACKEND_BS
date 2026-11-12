import type { Transaction } from 'sequelize';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { RegisterCompanyInput } from '../interfaces/company.interface';
import { hasFullCompanyAccess } from '../../../shared/utils/accessScope';
import { idPublicId } from '../../../shared/utils/ids';
import { BadRequestError, ConflictError, ForbiddenError } from '../../../shared/errors/CustomErrors';
import * as CompanyRepository from '../repository/company.repository';
import * as SaaSPlanRepository from '../../saas/repository/saasPlan.repository';
import * as SubscriptionRepository from '../../saas/repository/saasSubscription.repository';
import * as PlanLimitsService from '../../saas/service/planLimits.service';

interface RegistrationCoverage {
    tenantId: string;
    planId: number;
    planName: string;
    subscriptionId: number | null;
}

// Se ejecuta dentro de la transacción del alta, antes de crear usuarios o empresas.
export const resolveRegistrationCoverage = async (
    payload: RegisterCompanyInput,
    user: AuthenticatedUser,
    transaction: Transaction,
): Promise<RegistrationCoverage> => {
    if (!user.permissions.includes('company.create') && !user.permissions.includes('system.full_access')) {
        throw new ForbiddenError('No tienes permisos para crear empresas.');
    }

    if (hasFullCompanyAccess(user)) {
        if (payload.source_company_public_id) throw new BadRequestError('El alta de system crea una empresa primaria con su propio plan.');
        if (!payload.plan) throw new BadRequestError('La empresa primaria debe seleccionar un plan.');
        const plan = await SaaSPlanRepository.findByPublicId(payload.plan.plan_public_id, transaction);
        if (!plan?.is_active) throw new BadRequestError('El plan seleccionado no existe o no está activo.');
        if (plan.max_users !== null && plan.max_users < 1) throw new ConflictError('El plan debe permitir al menos un usuario para registrar al dueño.');
        return { tenantId: idPublicId(), planId: plan.plan_id, planName: plan.name, subscriptionId: null };
    }

    // El permiso habilita el alta; solo scope_level 1 crea un tenant nuevo.
    if (payload.plan) throw new BadRequestError('Una empresa hermana hereda el plan de su grupo; no debe seleccionar otro plan.');
    const entities = await CompanyRepository.findRegistrationSources(user.company_ids ?? [], transaction);
    const roots = new Map(entities.flatMap((entity) => {
        const root = entity.parent_company_id === null ? entity : entity.parentCompany;
        if (!root || root.parent_company_id !== null || root.tenant_id !== entity.tenant_id) return [];
        return [[Number(root.company_id), root] as const];
    }));
    let candidates = [...roots.values()];
    if (payload.source_company_public_id) {
        candidates = candidates.filter((root) => root.public_id === payload.source_company_public_id);
    }
    if (!candidates.length) throw new ForbiddenError('Debés pertenecer a la empresa de origen o a una de sus sucursales.');
    if (new Set(candidates.map((root) => root.tenant_id)).size !== 1) {
        throw new BadRequestError('Seleccioná la empresa de origen para crear la hermana dentro de su grupo.');
    }

    const plans = await SubscriptionRepository.findPlansByCompanyIds(candidates.map((root) => root.company_id), transaction);
    const subscriptionIds = new Set(candidates.map((root) => plans[root.company_id]?.subscriptionId));
    if (candidates.some((root) => !plans[root.company_id]) || subscriptionIds.size !== 1) {
        throw new ConflictError('Las empresas de origen no tienen una suscripción compartida válida.');
    }
    const source = candidates[0];
    if (source.is_enabled !== 'A') throw new ConflictError('La empresa de origen no está habilitada.');
    const subscriptionId = plans[source.company_id].subscriptionId;
    const subscription = await SubscriptionRepository.lockById(subscriptionId, transaction);
    if (!subscription) throw new ConflictError('La empresa de origen no tiene una suscripción válida.');

    // Releer vigencia y características después del bloqueo, antes de agregar la hermana.
    const plan = await PlanLimitsService.assertPlanFeature(source.company_id, 'allowsMultiCompany', transaction);
    if (plan.subscriptionId !== subscriptionId) throw new ConflictError('La suscripción cambió. Intentá nuevamente.');
    if (plan.maxUsers !== null && plan.maxUsers < 1) throw new ConflictError('El plan debe permitir al menos un usuario para registrar al dueño.');
    const primary = await SubscriptionRepository.findPrimaryCompany(subscriptionId, transaction);
    if (!primary || primary.parent_company_id !== null || primary.tenant_id !== source.tenant_id) {
        throw new ConflictError('La suscripción no tiene una empresa primaria válida en este grupo.');
    }
    return { tenantId: primary.tenant_id, planId: plan.planId, planName: plan.planName, subscriptionId };
};
