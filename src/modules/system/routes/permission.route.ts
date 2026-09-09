import { createRouter } from '../../../shared/utils/createRouter';
import { resolveAuthorization } from '../../auth/middlewares/resolveAuthorization';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateQuery, validateDTO } from '../../../shared/middlewares/validateDTO';
import { listPermissionsQuerySchema, createPermissionSchema, updatePermissionSchema } from '../dto/permission.dto';
import { listAdmin, listModules, listCatalog, create, update, remove } from '../controllers/permission.controller';

const router = createRouter();

/**
 * @route GET /api/system/permissions
 * @desc  Lista el catálogo de permisos, paginado (20 por página); con `search`, busca por key o label sin paginar; con `module`/`group`, filtra por módulo/grupo (combinables)
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
 * @route GET /api/system/permissions/catalog
 * @desc  Catálogo completo, sin paginar — para pickers de checkboxes (ej. asignar permisos a un usuario)
 * @access system
 */
router.get('/permissions/catalog', resolveAuthorization, verificarPermiso('system.full_access'), listCatalog);

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
