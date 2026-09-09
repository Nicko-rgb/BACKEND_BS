import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateQuery, validateDTO } from '../../../shared/middlewares/validateDTO';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';
import { createSportCategorySchema, updateSportCategorySchema } from '../dto/sportCategory.dto';
import { list, listActive, create, update, remove } from '../controllers/sportCategory.controller';

const router = createRouter();

/**
 * @route GET /api/system/sport-categories
 * @desc  Lista todas las categorías deportivas, paginado
 * @access system
 */
router.get('/sport-categories', resolveAuthorization, verificarPermiso('sport_category.manage'), validateQuery(paginationQuerySchema), list);

/**
 * @route GET /api/system/sport-categories/active
 * @desc  Lista categorías deportivas activas, sin paginar, para selects/lógica de negocio
 * @access Público
 */
router.get('/sport-categories/active', listActive);

/**
 * @route POST /api/system/sport-categories
 * @desc  Crea una categoría deportiva nueva
 * @access system
 */
router.post('/sport-categories', resolveAuthorization, verificarPermiso('sport_category.manage'), validateDTO(createSportCategorySchema), create);

/**
 * @route PUT /api/system/sport-categories/:id
 * @desc  Actualiza una categoría deportiva existente
 * @access system
 */
router.put('/sport-categories/:id', resolveAuthorization, verificarPermiso('sport_category.manage'), validateDTO(updateSportCategorySchema), update);

/**
 * @route DELETE /api/system/sport-categories/:id
 * @desc  Elimina una categoría deportiva
 * @access system
 */
router.delete('/sport-categories/:id', resolveAuthorization, verificarPermiso('sport_category.manage'), remove);

export default router;
