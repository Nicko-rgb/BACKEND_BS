import Joi from 'joi';
import type { MenuItem } from '../database/models';

const APP_ACCESS_VALUES = ['admin', 'booking', 'both'];

// Forma de un ítem de menú para el frontend — nunca expone required_permission ni is_active.
export const toMenuItemDto = (item: MenuItem) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    path: item.path,
    parentKey: item.parent_key,
    groupTitle: item.group_title,
});

// Forma completa para el admin (system.full_access) — a diferencia de toMenuItemDto, sí expone
// required_permission/is_active/app_access/sort_order, porque acá se gestiona el catálogo, no se
// renderiza un menú de navegación.
export const toMenuItemAdminDto = (item: MenuItem, childrenCount = 0) => ({
    id: item.menu_id,
    key: item.key,
    label: item.label,
    icon: item.icon,
    path: item.path,
    parentKey: item.parent_key,
    requiredPermission: item.required_permission,
    appAccess: item.app_access,
    groupTitle: item.group_title,
    sortOrder: item.sort_order,
    isActive: item.is_active,
    childrenCount,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
});

// PUT reemplaza el registro completo — todos los campos son requeridos. `key` viaja también acá
// (convención del proyecto), pero el front lo deja de solo lectura al editar para no huerfanar
// a los hijos que la referencian por parent_key.
export const updateMenuItemSchema = Joi.object({
    key: Joi.string().min(2).max(50).lowercase().pattern(/^[a-z0-9_-]+$/).required()
        .messages({
            'string.base': 'La key es requerida',
            'string.empty': 'La key es requerida',
            'string.min': 'La key debe tener al menos 2 caracteres',
            'string.max': 'La key no puede superar 50 caracteres',
            'string.pattern.base': 'La key solo puede tener minúsculas, números, guion y guion bajo',
            'any.required': 'La key es requerida',
        }),

    label: Joi.string().min(2).max(100).required()
        .messages({
            'string.base': 'La etiqueta es requerida',
            'string.empty': 'La etiqueta es requerida',
            'string.min': 'La etiqueta debe tener al menos 2 caracteres',
            'string.max': 'La etiqueta no puede superar 100 caracteres',
            'any.required': 'La etiqueta es requerida',
        }),

    icon: Joi.string().max(80).allow('', null)
        .messages({
            'string.max': 'El ícono no puede superar 80 caracteres',
        }),

    path: Joi.string().max(200).allow('', null)
        .messages({
            'string.max': 'La ruta no puede superar 200 caracteres',
        }),

    parent_key: Joi.string().max(50).allow('', null)
        .messages({
            'string.max': 'La key del padre no puede superar 50 caracteres',
        }),

    required_permission: Joi.string().max(100).allow('', null)
        .messages({
            'string.max': 'El permiso requerido no puede superar 100 caracteres',
        }),

    app_access: Joi.string().valid(...APP_ACCESS_VALUES).required()
        .messages({
            'string.empty': 'El acceso por app es requerido',
            'any.only': 'El acceso por app debe ser admin, booking o both',
            'any.required': 'El acceso por app es requerido',
        }),

    group_title: Joi.string().max(50).allow('', null)
        .messages({
            'string.max': 'El grupo no puede superar 50 caracteres',
        }),

    sort_order: Joi.number().integer().min(0).required()
        .messages({
            'number.base': 'El orden es requerido',
            'number.min': 'El orden no puede ser negativo',
            'any.required': 'El orden es requerido',
        }),

    is_active: Joi.boolean().required()
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
            'any.required': 'El estado activo es requerido',
        }),
});

// POST creación — mismos campos que el PUT, salvo app_access/sort_order/is_active que son opcionales (con default, igual que el modelo).
export const createMenuItemSchema = updateMenuItemSchema.keys({
    app_access: Joi.string().valid(...APP_ACCESS_VALUES).default('admin')
        .messages({
            'any.only': 'El acceso por app debe ser admin, booking o both',
        }),
    sort_order: Joi.number().integer().min(0).default(0)
        .messages({
            'number.base': 'El orden debe ser un número',
            'number.min': 'El orden no puede ser negativo',
        }),
    is_active: Joi.boolean().default(true)
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
        }),
});
