import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { registerSucursalSchema, updateSucursalSchema } from '../dto/sucursal.schema';
import { registerSucursal, getByPublicId, updateByPublicId } from '../controllers/sucursal.controller';

const router = createRouter();

/**
 * @route POST /api/sucursals/:companyPublicId
 * @desc  Registro de una sucursal bajo una empresa
 * @access system, super_admin (dueño de esa empresa)
 */
router.post('/:companyPublicId',
    resolveAuthorization,
    verificarPermiso('sucursal.create'),
    validateDTO(registerSucursalSchema),
    registerSucursal
);

/**
 * @route GET /api/sucursals/:publicId
 * @desc  Detalle de una sucursal — se busca por su propio public_id, para precargar el form de edición.
 * @access system, super_admin (dueño de la empresa)
 */
router.get('/:publicId',
    resolveAuthorization,
    verificarPermiso('sucursal.view'),
    getByPublicId
);

/**
 * @route PUT /api/sucursals/:publicId
 * @desc  Actualiza los datos de una sucursal.
 * @access system, super_admin (dueño de la empresa)
 */
router.put('/:publicId',
    resolveAuthorization,
    verificarPermiso('sucursal.edit'),
    validateDTO(updateSucursalSchema),
    updateByPublicId
);

export default router;
