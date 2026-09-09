import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateQuery, validateDTO } from '../../../shared/middlewares/validateDTO';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';
import { createSurfaceTypeSchema, updateSurfaceTypeSchema } from '../dto/surfaceType.dto';
import { list, listActive, create, update, remove } from '../controllers/surfaceType.controller';

const router = createRouter();

/**
 * @route GET /api/system/surface-types
 * @desc  Lista todos los tipos de superficie, paginado
 * @access system
 */
router.get('/surface-types', resolveAuthorization, verificarPermiso('surface_type.manage'), validateQuery(paginationQuerySchema), list);

/**
 * @route GET /api/system/surface-types/active
 * @desc  Lista tipos de superficie activos, sin paginar, para selects/lógica de negocio
 * @access Público
 */
router.get('/surface-types/active', listActive);

/**
 * @route POST /api/system/surface-types
 * @desc  Crea un tipo de superficie nuevo
 * @access system
 */
router.post('/surface-types', resolveAuthorization, verificarPermiso('surface_type.manage'), validateDTO(createSurfaceTypeSchema), create);

/**
 * @route PUT /api/system/surface-types/:id
 * @desc  Actualiza un tipo de superficie existente
 * @access system
 */
router.put('/surface-types/:id', resolveAuthorization, verificarPermiso('surface_type.manage'), validateDTO(updateSurfaceTypeSchema), update);

/**
 * @route DELETE /api/system/surface-types/:id
 * @desc  Elimina un tipo de superficie
 * @access system
 */
router.delete('/surface-types/:id', resolveAuthorization, verificarPermiso('surface_type.manage'), remove);

export default router;
