import { createRouter } from '../../../shared/utils/createRouter';
import { verificarTokenAuth } from '../../../shared/middlewares/verificarTokenAuth';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateQuery, validateDTO } from '../../../shared/middlewares/validateDTO';
import { listUsersQuerySchema, updateUserSchema } from '../dto/user.schema';
import { list, getById, update } from '../controllers/user.controller';

const router = createRouter();

/**
 * @route GET /api/users
 * @desc  Lista todos los usuarios del sistema, paginado, con búsqueda (nombre o correo) y filtros por rol y país
 * @access system
 */
router.get('/', verificarTokenAuth, verificarPermiso('user.manage_all'), validateQuery(listUsersQuerySchema), list);

/**
 * @route GET /api/users/:id
 * @desc  Detalle completo de un usuario (User + Person), para el formulario de edición
 * @access system
 */
router.get('/:id', verificarTokenAuth, verificarPermiso('user.manage_all'), getById);

/**
 * @route PUT /api/users/:id
 * @desc  Actualiza los datos de un usuario — todo menos password
 * @access system
 */
router.put('/:id', verificarTokenAuth, verificarPermiso('user.manage_all'), validateDTO(updateUserSchema), update);

export default router;
