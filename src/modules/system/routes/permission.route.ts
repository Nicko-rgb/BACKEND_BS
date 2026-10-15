import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateQuery, validateDTO } from '../../../shared/middlewares/validateDTO';
import { listPermissionsQuerySchema, createPermissionSchema, updatePermissionSchema } from '../dto/permission.dto';
import { listAdmin, listModules, listAssignable, create, update, remove } from '../controllers/permission.controller';

const router = createRouter();

/**
 * @route GET /api/system/permissions
 * @desc  Catálogo de permisos — con page/limit pagina (tabla); sin ellos trae todo (pickers).
 *        Con `search`, busca por key o label; con `module`/`group`, filtra por módulo/grupo (combinables)
 * @access system
 */
router.get('/permissions', resolveAuthorization, verificarPermiso('system.full_access'), validateQuery(listPermissionsQuerySchema), listAdmin);

/**
 * @route GET /api/system/permissions/modules
 * @desc  Módulos y grupos distintos del catálogo ({ modules, groups }) — un solo request para
 *        poblar los dos filtros del frontend
 * @access system
 */
router.get('/permissions/modules', resolveAuthorization, verificarPermiso('system.full_access'), listModules);

/**
 * @route GET /api/system/permissions/assignable
 * @desc  Servida dinámica para pickers — system ve todo; el resto solo lo repartible
 *        (ASSIGNABLE_PERMISSION_KEYS). Sin paginar.
 * @access system o gestión de usuarios (mismo set que el picker de users)
 */
router.get('/permissions/assignable', resolveAuthorization, verificarPermiso('system.full_access', 'user.administrator_manage', 'user.employee_manage'), listAssignable);

/**
 * @route POST /api/system/permissions
 * @desc  Crea un permiso nuevo
 * @access system
 */
router.post('/permissions', resolveAuthorization, verificarPermiso('system.full_access'), validateDTO(createPermissionSchema), create);

/**
 * @route PUT /api/system/permissions/:id
 * @desc  Actualiza un permiso existente
 * @access system
 */
router.put('/permissions/:id', resolveAuthorization, verificarPermiso('system.full_access'), validateDTO(updatePermissionSchema), update);

/**
 * @route DELETE /api/system/permissions/:id
 * @desc  Elimina un permiso — bloqueado si todavía está en uso
 * @access system
 */
router.delete('/permissions/:id', resolveAuthorization, verificarPermiso('system.full_access'), remove);

export default router;
