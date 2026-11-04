import * as SaaSSubscriptionRepository from '../repository/saasSubscription.repository';
import * as CompanyRepository from '../../companys/repository/company.repository';
import { assertCompanyScope } from '../../../shared/utils/accessScope';
import { NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';

/**
 * Estado comercial de la suscripción que cubre a una empresa raíz.
 *
 * A diferencia de `planLimits.service.getPlanUsage` (que solo expone cupos y exige
 * suscripción vigente), acá se devuelve la suscripción en cualquier estado — incluida
 * una vencida o cancelada — porque la vista de suscripción tiene que poder mostrarla.
 * Por eso NO usa `getActivePlanForCompany`.
 *
 * Las mutaciones (cambio de plan, cancelar, reanudar) se suman en este mismo service:
 * es el dueño del ciclo de vida comercial, mientras `planLimits` queda como el dueño
 * de la regla "¿puede crear este recurso?".
 */
export const getSubscription = async (companyPublicId: string, user: AuthenticatedUser) => {
    const root = await CompanyRepository.findByPublicId(companyPublicId);
    if (!root) throw new NotFoundError('Empresa no encontrada');
    const companyId = Number(root.company_id);

    assertCompanyScope(user, companyId, 'No tienes acceso a esta empresa');

    const subscription = await SaaSSubscriptionRepository.findByCompanyId(companyId);
    if (!subscription) throw new NotFoundError('La empresa no tiene una suscripción asociada.');

    const primaryCompany = await SaaSSubscriptionRepository.findPrimaryCompany(subscription.subscription_id);

    return { subscription, primaryCompany };
};
