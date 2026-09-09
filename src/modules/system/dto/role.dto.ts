import Joi from 'joi';
import type { Role } from '../database/models';

// Forma de un rol para el frontend — no expone nada sensible, es un catálogo chico y visible.
export const toRoleDto = (role: Role) => ({
    id: role.role_id,
    key: role.key,
    label: role.label,
    scopeLevel: role.scope_level,
    isActive: role.is_active,
    createdAt: role.created_at,
    updatedAt: role.updated_at,
});

// POST alta — key sigue el mismo formato que permission.key (minúsculas, números y guion bajo),
// sin puntos: a diferencia de un permiso (`modulo.accion`), un rol es una sola palabra
// (`administrador`, `encargado_turno`). Los 5 roles base (cliente/empleado/administrador/
// super_admin/system) se siembran en roleSeed; esto es para agregar roles nuevos desde la UI.
export const createRoleSchema = Joi.object({
    key: Joi.string().min(2).max(50).lowercase().pattern(/^[a-z0-9_]+$/).required()
        .messages({
            'string.base': 'La key es requerida',
            'string.empty': 'La key es requerida',
            'string.min': 'La key debe tener al menos 2 caracteres',
            'string.max': 'La key no puede superar 50 caracteres',
            'string.pattern.base': 'La key solo puede tener minúsculas, números y guion bajo',
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

    scope_level: Joi.number().integer().min(1).max(4).allow(null)
        .messages({
            'number.min': 'El nivel de alcance debe estar entre 1 y 4',
            'number.max': 'El nivel de alcance debe estar entre 1 y 4',
        }),

    is_active: Joi.boolean().default(true),
});

// PUT edición parcial — `key` no se edita: es el ancla que usa el resto del sistema para
// identificar un rol (ej. loginAdmin bloquea el key 'cliente', roleSeed/systemUserSeed buscan
// por key 'system'). Cambiarla rompería esas referencias.
export const updateRoleSchema = Joi.object({
    label: Joi.string().min(2).max(100)
        .messages({
            'string.min': 'La etiqueta debe tener al menos 2 caracteres',
            'string.max': 'La etiqueta no puede superar 100 caracteres',
        }),

    scope_level: Joi.number().integer().min(1).max(4).allow(null)
        .messages({
            'number.min': 'El nivel de alcance debe estar entre 1 y 4',
            'number.max': 'El nivel de alcance debe estar entre 1 y 4',
        }),

    is_active: Joi.boolean(),
}).min(1).messages({
    'object.min': 'Debe enviar al menos un campo para actualizar',
});

// Reemplazo completo del set de permisos base de un rol — mismo contrato que
// userPermission.schema.ts::updateUserPermissionsSchema (el checkbox picker manda siempre el
// estado final, no un diff).
export const replaceRolePermissionsSchema = Joi.object({
    permission_keys: Joi.array().items(Joi.string()).required()
        .messages({
            'any.required': 'La lista de permisos es requerida',
        }),
});
