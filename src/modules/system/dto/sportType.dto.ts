import Joi from 'joi';
import type { SportType } from '../database/models';

export const toSportTypeDto = (sportType: SportType, referencesCount = 0) => ({
    id: sportType.sport_type_id,
    code: sportType.code,
    name: sportType.name,
    isActive: sportType.is_active,
    referencesCount,
    createdAt: sportType.created_at,
    updatedAt: sportType.updated_at,
});

// PUT reemplaza el registro completo — todos los campos son requeridos.
export const updateSportTypeSchema = Joi.object({
    code: Joi.string().min(2).max(32).uppercase().pattern(/^[A-Z0-9_]+$/).required()
        .messages({
            'string.base': 'El código es requerido',
            'string.empty': 'El código es requerido',
            'string.min': 'El código debe tener al menos 2 caracteres',
            'string.max': 'El código no puede superar 32 caracteres',
            'string.pattern.base': 'El código solo puede tener mayúsculas, números y guion bajo',
            'any.required': 'El código es requerido',
        }),

    name: Joi.string().min(2).max(64).required()
        .messages({
            'string.base': 'El nombre es requerido',
            'string.empty': 'El nombre es requerido',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede superar 64 caracteres',
            'any.required': 'El nombre es requerido',
        }),

    is_active: Joi.boolean().required()
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
            'any.required': 'El estado activo es requerido',
        }),
});

// POST creación — mismos campos que el PUT, salvo is_active que es opcional (default true, igual que el modelo).
export const createSportTypeSchema = updateSportTypeSchema.keys({
    is_active: Joi.boolean().default(true)
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
        }),
});
