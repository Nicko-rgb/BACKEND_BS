import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { updatePlanSchema } from '../dto/plan.schema';
import { list, listActive, update, remove } from '../controllers/plan.controller';

const router = createRouter();

/**
 * @route GET /api/saas/plans
 * @desc  Lista todos los planes (activos e inactivos), sin paginar (catálogo chico)
 * @access system
 */
router.get('/plans', resolveAuthorization, verificarPermiso('plan.manage'), list);

/**
 * @route GET /api/saas/plans/active
 * @desc  Lista planes activos, sin paginar, para selects/lógica de negocio
 * @access Público
 */
router.get('/plans/active', listActive);

/**
 * @route PUT /api/saas/plans/:id
 * @desc  Actualiza un plan existente
 * @access system
 */
router.put('/plans/:id', resolveAuthorization, verificarPermiso('plan.manage'), validateDTO(updatePlanSchema), update);

/**
 * @route DELETE /api/saas/plans/:id
 * @desc  Elimina un plan — bloqueado si tiene suscripciones asociadas
 * @access system
 */
router.delete('/plans/:id', resolveAuthorization, verificarPermiso('plan.manage'), remove);

export default router;
