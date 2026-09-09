import { createRouter } from '../../../shared/utils/createRouter';
import { verificarTokenAuth } from '../../../shared/middlewares/verificarTokenAuth';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { createCountrySchema, updateCountrySchema } from '../dto/country.dto';
import { list, listActive, create, update, remove } from '../controllers/country.controller';

const router = createRouter();

/**
 * @route GET /api/system/countries
 * @desc  Lista todos los países, sin paginar (catálogo chico)
 * @access system
 */
router.get('/countries', verificarTokenAuth, verificarPermiso('country.manage'), list);

/**
 * @route GET /api/system/countries/active
 * @desc  Lista países activos, sin paginar, para selects/lógica de negocio
 * @access Público
 */
router.get('/countries/active', listActive);

/**
 * @route POST /api/system/countries
 * @desc  Crea un país nuevo
 * @access system
 */
router.post('/countries', verificarTokenAuth, verificarPermiso('country.manage'), validateDTO(createCountrySchema), create);

/**
 * @route PUT /api/system/countries/:id
 * @desc  Actualiza un país existente
 * @access system
 */
router.put('/countries/:id', verificarTokenAuth, verificarPermiso('country.manage'), validateDTO(updateCountrySchema), update);

/**
 * @route DELETE /api/system/countries/:id
 * @desc  Elimina un país
 * @access system
 */
router.delete('/countries/:id', verificarTokenAuth, verificarPermiso('country.manage'), remove);

export default router;
