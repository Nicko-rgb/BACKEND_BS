import { createRouter } from '../../../shared/utils/createRouter';
import { verificarTokenAuth } from '../../../shared/middlewares/verificarTokenAuth';
import { verificarPermiso } from '../../../shared/middlewares/verificarPermiso';
import { validateQuery, validateDTO } from '../../../shared/middlewares/validateDTO';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';
import { createMenuItemSchema, updateMenuItemSchema } from '../dto/menu.dto';
import { getMenu, listAdmin, create, update, remove } from '../controllers/menu.controller';

const router = createRouter();

/**
 * @route GET /api/system/my-menu
 * @desc  Menú de navegación del usuario autenticado, filtrado por su app (admin/booking) y sus permisos
 * @access Autenticado
 */
router.get('/my-menu', verificarTokenAuth, getMenu);

/**
 * @route GET /api/system/menu-items
 * @desc  Lista todos los ítems de menú (activos e inactivos, cualquier app), sin filtrar por permiso
 * @access system
 */
router.get('/menu-items', verificarTokenAuth, verificarPermiso('menu.manage'), validateQuery(paginationQuerySchema), listAdmin);

/**
 * @route POST /api/system/menu-items
 * @desc  Crea un ítem de menú nuevo
 * @access system
 */
router.post('/menu-items', verificarTokenAuth, verificarPermiso('menu.manage'), validateDTO(createMenuItemSchema), create);

/**
 * @route PUT /api/system/menu-items/:id
 * @desc  Actualiza un ítem de menú existente
 * @access system
 */
router.put('/menu-items/:id', verificarTokenAuth, verificarPermiso('menu.manage'), validateDTO(updateMenuItemSchema), update);

/**
 * @route DELETE /api/system/menu-items/:id
 * @desc  Elimina un ítem de menú — bloqueado si tiene hijos
 * @access system
 */
router.delete('/menu-items/:id', verificarTokenAuth, verificarPermiso('menu.manage'), remove);

export default router;
