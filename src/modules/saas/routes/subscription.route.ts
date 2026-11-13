import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../../shared/middlewares/resolveAuthorization';
import { validatePublicId } from '../../../shared/middlewares/validateDTO';
import { getDetail } from '../controllers/subscription.controller';

const router = createRouter();

/**
 * @route GET /api/v2/saas/subscription/:companyPublicId/current-plan
 * @desc  Suscripción compartida del grupo de la empresa: plan, estado, vigencia, período,
 *        período de facturación, pasarela y empresa titular.
 * @access usuarios con acceso a esa empresa (el alcance lo valida el service)
 *
 * Las mutaciones (cambio de plan, cancelar, reanudar, facturas) se agregan en este
 * mismo router, siempre ANTES de la ruta con `:companyPublicId` si son estáticas.
 */
router.get('/:companyPublicId/current-plan', resolveAuthorization(), validatePublicId('companyPublicId'), getDetail);

export default router;
