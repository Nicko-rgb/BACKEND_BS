import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateQuery, validateDTOByParam } from '../../../shared/middlewares/validateDTO';
import { listUsersQuerySchema, createUserSchemas, updateUserSchemas } from '../dto/userManage.schema';
import { list, getById, create, update } from '../controllers/userManage.controller';

const router = createRouter();

// :role = rol del usuario gestionado (system | super_admin | administrador | empleado | cliente).
// La ruta exige al menos un permiso de gestión de usuarios; el permiso exacto de cada rol lo valida
// el service contra roleHierarchy.ts.

/**
 * @route GET /api/users/manage
 * @desc  Catálogo global de usuarios, paginado, con búsqueda (nombre o correo) y filtros por rol y país
 * @access system
 */
router.get('/', resolveAuthorization, verificarPermiso('user.manage_all'), validateQuery(listUsersQuerySchema), list);

/**
 * @route GET /api/users/manage/:role/:id
 * @desc  Detalle de un usuario de ese rol, con sus asignaciones de empresa/sucursal
 * @access permiso de gestión del rol
 */
router.get('/:role/:id', resolveAuthorization, verificarPermiso('user.manage_all', 'user.administrator_manage', 'user.employee_manage', 'user.client_manage'), getById);

/**
 * @route POST /api/users/manage/:role
 * @desc  Alta de un usuario con ese rol
 * @access permiso de gestión del rol
 */
router.post('/:role', resolveAuthorization, verificarPermiso('user.manage_all', 'user.administrator_manage', 'user.employee_manage', 'user.client_manage'), validateDTOByParam('role', createUserSchemas), create);

/**
 * @route PUT /api/users/manage/:role/:id
 * @desc  Edición de un usuario de ese rol (su rol actual) — nunca contraseña
 * @access permiso de gestión del rol
 */
router.put('/:role/:id', resolveAuthorization, verificarPermiso('user.manage_all', 'user.administrator_manage', 'user.employee_manage', 'user.client_manage'), validateDTOByParam('role', updateUserSchemas), update);

export default router;
