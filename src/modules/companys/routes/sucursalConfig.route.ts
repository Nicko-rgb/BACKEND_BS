import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO, validatePublicId } from '../../../shared/middlewares/validateDTO';
import { saveSucursalConfigSchema } from '../dto/sucursalConfig.schema';
import { getConfiguration, saveConfiguration } from '../controllers/sucursalConfig.controller';

const router = createRouter();

/**
 * @route GET /api/sucursal-configurations/:sucursalPublicId
 * @desc  Configuración de una sucursal — 404 si todavía no tiene.
 * @access system, super_admin (dueño de la empresa), administrador de la sucursal
 */
router.get('/:sucursalPublicId',
    resolveAuthorization,
    verificarPermiso('sucursal.view'),
    validatePublicId('sucursalPublicId'),
    getConfiguration
);

/**
 * @route PUT /api/sucursal-configurations/:sucursalPublicId
 * @desc  Upsert de configuración — crea si no existe, actualiza si existe.
 * @access system, super_admin (dueño de la empresa), administrador de la sucursal
 */
router.put('/:sucursalPublicId',
    resolveAuthorization,
    verificarPermiso('sucursal.config'),
    validatePublicId('sucursalPublicId'),
    validateDTO(saveSucursalConfigSchema),
    saveConfiguration
);

export default router;
