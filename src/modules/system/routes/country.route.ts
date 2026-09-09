import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
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
router.get('/countries', resolveAuthorization, verificarPermiso('country.manage'), list);

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
router.post('/countries', resolveAuthorization, verificarPermiso('country.manage'), validateDTO(createCountrySchema), create);

/**
 * @route PUT /api/system/countries/:id
 * @desc  Actualiza un país existente
 * @access system
 */
router.put('/countries/:id', resolveAuthorization, verificarPermiso('country.manage'), validateDTO(updateCountrySchema), update);

/**
 * @route DELETE /api/system/countries/:id
 * @desc  Elimina un país
 * @access system
 */
router.delete('/countries/:id', resolveAuthorization, verificarPermiso('country.manage'), remove);

export default router;
