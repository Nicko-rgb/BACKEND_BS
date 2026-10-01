import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import upload from '../../../shared/middlewares/uploadMiddleware';
import { uploadMediaSchema } from '../dto/media.dto';
import { upload as uploadMedia, listByMedible, remove } from '../controllers/media.controller';

const router = createRouter();

/**
 * @route POST /api/system/media/upload
 * @desc  Sube un archivo (campo `cover`) y lo registra para una entidad.
 * @access media.manage
 */
router.post('/media/upload',
    resolveAuthorization,
    verificarPermiso('media.manage'),
    upload.single('cover'),
    validateDTO(uploadMediaSchema),
    uploadMedia
);

/**
 * @route GET /api/system/media/:medibleType/:mediblePublicId
 * @desc  Archivos de una entidad (Company/Sucursal por public_id), principal primero.
 * @access media.manage
 */
router.get('/media/:medibleType/:mediblePublicId',
    resolveAuthorization,
    verificarPermiso('media.manage'),
    listByMedible
);

/**
 * @route DELETE /api/system/media/:publicId
 * @desc  Elimina el archivo físico y su registro.
 * @access media.manage
 */
router.delete('/media/:publicId',
    resolveAuthorization,
    verificarPermiso('media.manage'),
    remove
);

export default router;
