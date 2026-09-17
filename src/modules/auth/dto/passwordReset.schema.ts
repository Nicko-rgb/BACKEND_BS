import Joi from 'joi';

const token = Joi.string()
    .pattern(/^[A-Za-z0-9_-]{43}$/)
    .required()
    .messages({
        'string.empty': 'El enlace no es válido',
        'string.pattern.base': 'El enlace no es válido',
        'any.required': 'El enlace no es válido',
    });

export const passwordResetValidateSchema = Joi.object({ token });

export const passwordResetSchema = Joi.object({
    token,

    password: Joi.string()
        .min(8)
        .max(100)
        .required()
        .messages({
            'string.empty': 'La contraseña es requerida',
            'string.min': 'La contraseña debe tener al menos 8 caracteres',
            'string.max': 'La contraseña no puede superar 100 caracteres',
            'any.required': 'La contraseña es requerida',
        }),
});
