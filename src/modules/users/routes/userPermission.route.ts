import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../../shared/middlewares/resolveAuthorization';
import { validateDTO, validatePublicId } from '../../../shared/middlewares/validateDTO';
import { updateUserPermissionsSchema } from '../dto/userPermission.schema';
import { getByUserId, update } from '../controllers/userPermission.controller';

const router = createRouter();

/**
 * @route GET /api/v2/users/:publicId/permissions
 * @desc  Keys del set efectivo de permisos de un usuario
 * @access con user.permission_manage (sobre usuarios de su alcance; system bypasea)
 */
router.get('/:publicId/permissions',
    resolveAuthorization('user.permission_manage'),
    validatePublicId('publicId'),
    getByUserId
);

/**
 * @route PUT /api/v2/users/:publicId/permissions
 * @desc  Reemplaza el set completo de permisos de un usuario
 * @access con user.permission_manage (sobre usuarios de su alcance; system bypasea)
 */
router.put('/:publicId/permissions',
    resolveAuthorization('user.permission_manage'),
    validatePublicId('publicId'),
    validateDTO(updateUserPermissionsSchema),
    update
);

export default router;
