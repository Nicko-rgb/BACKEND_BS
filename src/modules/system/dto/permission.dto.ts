import Joi from 'joi';
import type { Permission } from '../database/models';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';

const APP_ACCESS_VALUES = ['admin', 'booking', 'both'];
// Mismo enum que dsg_bss_permissions.module (010_baseline_permissions.ts) — carpetas reales
// bajo src/modules/. Validado acá también para devolver un mensaje claro en vez del error crudo
// de Postgres si alguien manda un valor que no es ninguna de estas.
const MODULE_VALUES = ['bookings', 'companys', 'notificacions', 'saas', 'system', 'users'];

// Forma de un permiso del catálogo para el frontend. `routesCount` es el resultado del análisis
// estático de `verificarPermiso('key')` en las rutas del backend (countPermissionUsageInRoutes).
// `referencesCount` es la cantidad de usuarios a los que el permiso les llega efectivamente —
// vía el permiso base de su rol, o vía una excepción directa (ver
// permission.repository.ts::countEffectiveUsersByKeys). Ninguno de los dos es una columna de la tabla.
export const toPermissionDto = (permission: Permission, routesCount = 0, referencesCount = 0) => ({
    id: permission.permission_id,
    key: permission.key,
    label: permission.label,
    description: permission.description,
    module: permission.module,
    groupName: permission.group_name,
    appAccess: permission.app_access,
    routesCount,
    referencesCount,
    createdAt: permission.created_at,
    updatedAt: permission.updated_at,
});

// Query del listado — page/limit de paginationQuerySchema + search opcional (key o label) +
// module/group opcionales (filtro exacto cada uno, se pueden combinar).
export const listPermissionsQuerySchema = paginationQuerySchema.keys({
    search: Joi.string().trim().max(150).allow('')
        .messages({
            'string.max': 'La búsqueda no puede superar 150 caracteres',
        }),

    module: Joi.string().valid(...MODULE_VALUES).allow('')
        .messages({
            'any.only': 'El módulo debe ser uno de: ' + MODULE_VALUES.join(', '),
        }),

    group: Joi.string().trim().max(50).allow('')
        .messages({
            'string.max': 'El grupo no puede superar 50 caracteres',
        }),
});

// PUT reemplaza el registro completo — todos los campos son requeridos. El front deja `key` de
// solo lectura al editar (mismo criterio que menu_item.key), porque otras filas la referencian
// por string (role_permission.permission_key, user_permission.permission_key).
export const updatePermissionSchema = Joi.object({
    key: Joi.string().min(3).max(100).lowercase().pattern(/^[a-z0-9_]+(\.[a-z0-9_]+)+$/).required()
        .messages({
            'string.base': 'La key es requerida',
            'string.empty': 'La key es requerida',
            'string.min': 'La key debe tener al menos 3 caracteres',
            'string.max': 'La key no puede superar 100 caracteres',
            'string.pattern.base': 'La key debe tener formato modulo.accion (minúsculas, números y guion bajo)',
            'any.required': 'La key es requerida',
        }),

    label: Joi.string().min(2).max(150).required()
        .messages({
            'string.base': 'La etiqueta es requerida',
            'string.empty': 'La etiqueta es requerida',
            'string.min': 'La etiqueta debe tener al menos 2 caracteres',
            'string.max': 'La etiqueta no puede superar 150 caracteres',
            'any.required': 'La etiqueta es requerida',
        }),

    description: Joi.string().max(500).allow('', null)
        .messages({
            'string.max': 'La descripción no puede superar 500 caracteres',
        }),

    module: Joi.string().valid(...MODULE_VALUES).required()
        .messages({
            'string.empty': 'El módulo es requerido',
            'any.only': 'El módulo debe ser uno de: ' + MODULE_VALUES.join(', '),
            'any.required': 'El módulo es requerido',
        }),

    group_name: Joi.string().min(2).max(50).lowercase().required()
        .messages({
            'string.base': 'El grupo es requerido',
            'string.empty': 'El grupo es requerido',
            'string.min': 'El grupo debe tener al menos 2 caracteres',
            'string.max': 'El grupo no puede superar 50 caracteres',
            'any.required': 'El grupo es requerido',
        }),

    app_access: Joi.string().valid(...APP_ACCESS_VALUES).required()
        .messages({
            'string.empty': 'El acceso por app es requerido',
            'any.only': 'El acceso por app debe ser admin, booking o both',
            'any.required': 'El acceso por app es requerido',
        }),
});

// POST creación — mismos campos que el PUT, salvo app_access que es opcional (default en el
// modelo, igual que en el modelo).
export const createPermissionSchema = updatePermissionSchema.keys({
    app_access: Joi.string().valid(...APP_ACCESS_VALUES).default('admin')
        .messages({
            'any.only': 'El acceso por app debe ser admin, booking o both',
        }),
});
