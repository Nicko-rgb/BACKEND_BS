import Joi from 'joi';

export const loginAdminSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.empty': 'El correo es requerido',
            'string.email': 'El correo no es válido',
            'any.required': 'El correo es requerido',
        }),

    password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.empty': 'La contraseña es requerida',
            'string.min': 'La contraseña debe tener al menos 6 caracteres',
            'any.required': 'La contraseña es requerida',
        }),
});