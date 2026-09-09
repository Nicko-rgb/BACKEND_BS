import { createRouter } from '../../../shared/utils/createRouter';
import { verificarTokenAuth } from '../../../shared/middlewares/verificarTokenAuth';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { updateUserPermissionsSchema } from '../dto/userPermission.schema';
import { getByUserId, update } from '../controllers/userPermission.controller';

const router = createRouter();

/**
 * @route GET /api/users/:id/permissions
 * @desc  Keys de los permisos directos de un usuario
 * @access system
 */
router.get('/:id/permissions', verificarTokenAuth, verificarPermiso('user.manage_all'), getByUserId);

/**
 * @route PUT /api/users/:id/permissions
 * @desc  Reemplaza el set completo de permisos directos de un usuario
 * @access system
 */
router.put('/:id/permissions', verificarTokenAuth, verificarPermiso('user.manage_all'), validateDTO(updateUserPermissionsSchema), update);

export default router;
