import Joi from 'joi';
import type { SportCategory } from '../database/models';

export const toSportCategoryDto = (sportCategory: SportCategory, referencesCount = 0) => ({
    id: sportCategory.sport_category_id,
    code: sportCategory.code,
    name: sportCategory.name,
    referencesCount,
    createdAt: sportCategory.created_at,
    updatedAt: sportCategory.updated_at,
});

// PUT reemplaza el registro completo — todos los campos son requeridos.
export const updateSportCategorySchema = Joi.object({
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
});

// POST creación — mismos campos requeridos que el PUT (el modelo no tiene is_active).
export const createSportCategorySchema = updateSportCategorySchema;
