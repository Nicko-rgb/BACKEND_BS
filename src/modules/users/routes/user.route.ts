import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateQuery, validateDTO } from '../../../shared/middlewares/validateDTO';
import { listUsersQuerySchema, updateUserSchema, updateOwnProfileSchema } from '../dto/user.schema';
import { list, getById, update, getOwnProfile, updateOwnProfile } from '../controllers/user.controller';

const router = createRouter();

/**
 * @route GET /api/users
 * @desc  Lista todos los usuarios del sistema, paginado, con búsqueda (nombre o correo) y filtros por rol y país
 * @access system
 */
router.get('/', resolveAuthorization, verificarPermiso('user.manage_all'), validateQuery(listUsersQuerySchema), list);

/**
 * @route GET /api/users/me
 * @desc  Detalle del propio perfil, para precargar la página de autoedición. Registrada antes
 *        que GET /:id porque si no Express matchea "/me" contra ese param.
 * @access cualquier usuario autenticado con `user.profile_edit`
 */
router.get('/me', resolveAuthorization, verificarPermiso('user.profile_edit'), getOwnProfile);

/**
 * @route GET /api/users/:id
 * @desc  Detalle completo de un usuario (User + Person), para el formulario de edición
 * @access system
 */
router.get('/:id', resolveAuthorization, verificarPermiso('user.manage_all'), getById);

/**
 * @route PUT /api/users/me
 * @desc  Autoedición del propio perfil — todo menos password, role e is_enabled. Registrada
 *        antes que PUT /:id porque si no Express matchea "/me" contra ese param.
 * @access cualquier usuario autenticado con `user.profile_edit`
 */
router.put('/me', resolveAuthorization, verificarPermiso('user.profile_edit'), validateDTO(updateOwnProfileSchema), updateOwnProfile);

/**
 * @route PUT /api/users/:id
 * @desc  Actualiza los datos de un usuario — todo menos password
 * @access system
 */
router.put('/:id', resolveAuthorization, verificarPermiso('user.manage_all'), validateDTO(updateUserSchema), update);

export default router;
