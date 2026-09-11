import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { registerSucursalSchema, updateSucursalSchema } from '../dto/sucursal.schema';
import { registerSucursal, getByTenantId, updateByTenantId } from '../controllers/sucursal.controller';

const router = createRouter();

/**
 * @route POST /api/sucursals/:companyTenantId
 * @desc  Registro de una sucursal bajo una empresa — companyTenantId es el tenant_id de la empresa padre.
 * @access system, super_admin (dueño de esa empresa)
 */
router.post('/:companyTenantId',
    resolveAuthorization,
    verificarPermiso('sucursal.manage'),
    validateDTO(registerSucursalSchema),
    registerSucursal
);

/**
 * @route GET /api/sucursals/:tenantId
 * @desc  Detalle de una sucursal — se busca por su propio tenant_id, para precargar el form de edición.
 * @access system, super_admin (dueño de la empresa)
 */
router.get('/:tenantId',
    resolveAuthorization,
    verificarPermiso('sucursal.manage'),
    getByTenantId
);

/**
 * @route PUT /api/sucursals/:tenantId
 * @desc  Actualiza los datos de una sucursal.
 * @access system, super_admin (dueño de la empresa)
 */
router.put('/:tenantId',
    resolveAuthorization,
    verificarPermiso('sucursal.manage'),
    validateDTO(updateSucursalSchema),
    updateByTenantId
);

export default router;
