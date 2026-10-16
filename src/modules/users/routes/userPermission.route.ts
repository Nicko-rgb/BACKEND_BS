import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { updateUserPermissionsSchema } from '../dto/userPermission.schema';
import { getByUserId, update } from '../controllers/userPermission.controller';

const router = createRouter();

/**
 * @route GET /api/users/:publicId/permissions
 * @desc  Keys del set efectivo de permisos de un usuario
 * @access con user.permission_manage (sobre usuarios de su alcance; system bypasea)
 */
router.get('/:publicId/permissions',
    resolveAuthorization,
    verificarPermiso('user.permission_manage'),
    getByUserId
);

/**
 * @route PUT /api/users/:publicId/permissions
 * @desc  Reemplaza el set completo de permisos de un usuario
 * @access con user.permission_manage (sobre usuarios de su alcance; system bypasea)
 */
router.put('/:publicId/permissions',
    resolveAuthorization,
    verificarPermiso('user.permission_manage'),
    validateDTO(updateUserPermissionsSchema),
    update
);

export default router;
