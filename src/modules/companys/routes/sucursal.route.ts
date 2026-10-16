import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import upload from '../../../shared/middlewares/uploadMiddleware';
import { registerSucursalSchema, updateSucursalSchema } from '../dto/sucursal.schema';
import { registerSucursal, getByPublicId, updateByPublicId, getBanner, uploadBanner, removeBanner } from '../controllers/sucursal.controller';
import { listBySucursal } from '../controllers/space.controller';

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
 * @desc  Detalle de una sucursal — se busca por su propio public_id
 * @access system, super_admin,
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

/**
 * @route GET /api/sucursals/:publicId/banner
 * @desc  Portada actual de la sucursal — null si no tiene
 * @access solo auth + pertenencia (la sucursal debe estar en el alcance del usuario)
 */
router.get('/:publicId/banner',
    resolveAuthorization,
    verificarPermiso('sucursal.edit'),
    getBanner
);

/**
 * @route POST /api/sucursals/:publicId/banner
 * @desc  Sube la portada (campo `cover`, pasa a primaria y desmarca la anterior)
 * @access solo auth + pertenencia (la sucursal debe estar en el alcance del usuario)
 */
router.post('/:publicId/banner',
    resolveAuthorization,
    verificarPermiso('sucursal.edit'),
    upload.single('cover'),
    uploadBanner
);

/**
 * @route DELETE /api/sucursals/:publicId/banner
 * @desc  Elimina la portada actual (físico + registro)
 * @access solo auth + pertenencia (la sucursal debe estar en el alcance del usuario)
 */
router.delete('/:publicId/banner',
    resolveAuthorization,
    verificarPermiso('sucursal.edit'),
    removeBanner
);

/**
 * @route GET /api/sucursals/:publicId/spaces
 * @desc  Espacios deportivos de la sucursal
 * @access usuarios con permiso space.view (sobre sucursales de su alcance)
 */
router.get('/:publicId/spaces',
    resolveAuthorization,
    verificarPermiso('space.view'),
    listBySucursal
);

export default router;
