import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO, validatePublicId } from '../../../shared/middlewares/validateDTO';
import upload from '../../../shared/middlewares/uploadMiddleware';
import { registerSpaceSchema, updateSpaceSchema, spaceStatusSchema } from '../dto/space.schema';
import { registerSpace, listBySucursal, spaceById, updateSpace, getGallery, uploadGalleryFile, removeGalleryFile, toggleSpaceStatus } from '../controllers/space.controller';

const router = createRouter();

/**
 * @route POST /api/spaces/:sucursalPublicId
 * @desc  Registro de un espacio deportivo bajo una sucursal — valida scope
 *        (dueño/admin/empleado de esa sucursal, system bypasea), catálogos y
 *        límite maxSpaces del plan por sucursal
 * @access usuarios con permiso space.create
 */
router.post('/:sucursalPublicId',
    resolveAuthorization,
    verificarPermiso('space.create'),
    validatePublicId('sucursalPublicId'),
    validateDTO(registerSpaceSchema),
    registerSpace
);

/**
 * @route GET /api/spaces/sucursals/:sucursalPublicId/list
 * @desc  Espacios deportivos de la sucursal
 * @access usuarios con permiso space.view (sobre sucursales de su alcance)
 */
router.get('/sucursals/:sucursalPublicId/list-spaces',
    resolveAuthorization,
    verificarPermiso('space.view'),
    validatePublicId('sucursalPublicId'),
    listBySucursal
);

/**
 * @route GET /api/spaces/space/:spacePublicId
 * @desc  Detalle de un espacio deportivo
 * @access usuarios con permiso space.view (sobre espacios que estan dentro de sus sucursales)
 */
router.get('/space/:spacePublicId/data-space',
    resolveAuthorization,
    verificarPermiso('space.view'),
    validatePublicId('spacePublicId'),
    spaceById
);

/**
 * @route PUT /api/spaces/space/:spacePublicId
 * @desc  Actualización de un espacio deportivo — valida scope sobre la sucursal
 *        del espacio (dueño/admin/empleado de esa sucursal, system bypasea),
 *        catálogos si se envían, y coherencia min/max booking.
 * @access usuarios con permiso space.edit
 */
router.put('/space/:spacePublicId',
    resolveAuthorization,
    verificarPermiso('space.edit'),
    validatePublicId('spacePublicId'),
    validateDTO(updateSpaceSchema),
    updateSpace
);

/**
 * @route PATCH /api/spaces/space/:spacePublicId/status
 * @desc  Cambio de estado del espacio (ACTIVE | MAINTENANCE | INACTIVE) — lo que
 *        mueve el switch de estado. Valida scope sobre la sucursal del espacio
 *        (dueño/admin/empleado de esa sucursal, system bypasea).
 * @access usuarios con permiso space.edit
 */
router.patch('/space/:spacePublicId/status',
    resolveAuthorization,
    verificarPermiso('space.edit'),
    validatePublicId('spacePublicId'),
    validateDTO(spaceStatusSchema),
    toggleSpaceStatus
);

/* ── Media Gallery de Space ───────────────────────────────────────── */

/**
 * @route GET /api/spaces/space/:spacePublicId/gallery
 * @desc  Archivos de la galería del espacio (imágenes y videos) — lista vacía si no hay
 * @access usuarios con permiso space.view (sobre espacios dentro de su alcance)
 */
router.get('/space/:spacePublicId/gallerys-space',
    resolveAuthorization,
    verificarPermiso('space.view'),
    validatePublicId('spacePublicId'),
    getGallery
);

/**
 * @route POST /api/spaces/space/:spacePublicId/gallery
 * @desc  Sube un archivo a la galería del espacio (campo `media` — imagen o video)
 * @access usuarios con permiso space.media_manage
 */
router.post('/space/:spacePublicId/gallery',
    resolveAuthorization,
    verificarPermiso('space.media_manage'),
    validatePublicId('spacePublicId'),
    upload.single('media'),
    uploadGalleryFile
);

/**
 * @route DELETE /api/spaces/space/:spacePublicId/gallery/:mediaPublicId
 * @desc  Elimina un archivo de la galería del espacio (registro + archivo físico)
 * @access usuarios con permiso space.media_manage
 */
router.delete('/space/:spacePublicId/gallery/:mediaPublicId',
    resolveAuthorization,
    verificarPermiso('space.media_manage'),
    validatePublicId('spacePublicId', 'mediaPublicId'),
    removeGalleryFile
);


export default router;
