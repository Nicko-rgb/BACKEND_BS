import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { getPlanUsage } from '../controllers/planUsage.controller';

const router = createRouter();

/**
 * @route GET /api/saas/plan-usage/:companyId
 * @desc  Plan de la empresa, su empresa primaria y cuánto usa de cada límite (sucursales, usuarios, espacios, facturas)
 * @access usuarios con acceso a esa empresa (el alcance lo valida el service)
 */
router.get('/:companyId', resolveAuthorization, getPlanUsage);

export default router;
