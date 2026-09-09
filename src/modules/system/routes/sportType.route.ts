import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateQuery, validateDTO } from '../../../shared/middlewares/validateDTO';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';
import { createSportTypeSchema, updateSportTypeSchema } from '../dto/sportType.dto';
import { list, listActive, create, update, remove } from '../controllers/sportType.controller';

const router = createRouter();

/**
 * @route GET /api/system/sport-types
 * @desc  Lista todos los tipos de deporte, paginado
 * @access system
 */
router.get('/sport-types', resolveAuthorization, verificarPermiso('sport_type.manage'), validateQuery(paginationQuerySchema), list);

/**
 * @route GET /api/system/sport-types/active
 * @desc  Lista tipos de deporte activos, sin paginar, para selects/lógica de negocio
 * @access Público
 */
router.get('/sport-types/active', listActive);

/**
 * @route POST /api/system/sport-types
 * @desc  Crea un tipo de deporte nuevo
 * @access system
 */
router.post('/sport-types', resolveAuthorization, verificarPermiso('sport_type.manage'), validateDTO(createSportTypeSchema), create);

/**
 * @route PUT /api/system/sport-types/:id
 * @desc  Actualiza un tipo de deporte existente
 * @access system
 */
router.put('/sport-types/:id', resolveAuthorization, verificarPermiso('sport_type.manage'), validateDTO(updateSportTypeSchema), update);

/**
 * @route DELETE /api/system/sport-types/:id
 * @desc  Elimina un tipo de deporte
 * @access system
 */
router.delete('/sport-types/:id', resolveAuthorization, verificarPermiso('sport_type.manage'), remove);

export default router;
