import { createRouter } from '../../../shared/utils/createRouter';
import { verificarTokenAuth } from '../../../shared/middlewares/verificarTokenAuth';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { updatePlanSchema } from '../dto/plan.dto';
import { list, listActive, update, remove } from '../controllers/plan.controller';

const router = createRouter();

/**
 * @route GET /api/system/plans
 * @desc  Lista todos los planes (activos e inactivos), sin paginar (catálogo chico)
 * @access system
 */
router.get('/plans', verificarTokenAuth, verificarPermiso('plan.manage'), list);

/**
 * @route GET /api/system/plans/active
 * @desc  Lista planes activos, sin paginar, para selects/lógica de negocio
 * @access Público
 */
router.get('/plans/active', listActive);

/**
 * @route PUT /api/system/plans/:id
 * @desc  Actualiza un plan existente
 * @access system
 */
router.put('/plans/:id', verificarTokenAuth, verificarPermiso('plan.manage'), validateDTO(updatePlanSchema), update);

/**
 * @route DELETE /api/system/plans/:id
 * @desc  Elimina un plan — bloqueado si tiene suscripciones asociadas
 * @access system
 */
router.delete('/plans/:id', verificarTokenAuth, verificarPermiso('plan.manage'), remove);

export default router;
