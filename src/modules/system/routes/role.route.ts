import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateDTO } from '../../../shared/middlewares/validateDTO';
import { createRoleSchema, updateRoleSchema, replaceRolePermissionsSchema } from '../dto/role.dto';
import { listAll, create, update, remove, getPermissions, replacePermissions } from '../controllers/role.controller';

const router = createRouter();

/**
 * @route GET /api/system/roles
 * @desc  Roles visibles para el usuario autenticado, sin paginar — system ve el catálogo completo;
 *        el resto, solo los roles que puede asignar (ver roleHierarchy.ts)
 * @access cualquier usuario autenticado
 */
router.get('/roles', resolveAuthorization, listAll);

/**
 * @route POST /api/system/roles
 * @desc  Crea un rol nuevo
 * @access system
 */
router.post('/roles', resolveAuthorization, verificarPermiso('system.full_access'), validateDTO(createRoleSchema), create);

/**
 * @route PUT /api/system/roles/:id
 * @desc  Edición parcial de un rol (label/scope_level/is_active) — key no se edita
 * @access system
 */
router.put('/roles/:id', resolveAuthorization, verificarPermiso('system.full_access'), validateDTO(updateRoleSchema), update);

/**
 * @route DELETE /api/system/roles/:id
 * @desc  Elimina un rol — bloqueado si es uno de los roles base o si todavía tiene usuarios asignados
 * @access system
 */
router.delete('/roles/:id', resolveAuthorization, verificarPermiso('system.full_access'), remove);

/**
 * @route GET /api/system/roles/:id/permissions
 * @desc  Keys de los permisos base del rol
 * @access system
 */
router.get('/roles/:id/permissions', resolveAuthorization, verificarPermiso('system.full_access'), getPermissions);

/**
 * @route PUT /api/system/roles/:id/permissions
 * @desc  Reemplaza el set completo de permisos base del rol — aplica de inmediato a todos sus usuarios
 * @access system
 */
router.put('/roles/:id/permissions', resolveAuthorization, verificarPermiso('system.full_access'), validateDTO(replaceRolePermissionsSchema), replacePermissions);

export default router;
