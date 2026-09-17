import Joi from 'joi';

export const passwordRequestSchema = Joi.object({
    email: Joi.string()
        .email()
        .max(100)
        .required()
        .messages({
            'string.empty': 'El correo es requerido',
            'string.email': 'El correo no es válido',
            'string.max': 'El correo no puede superar los 100 caracteres',
            'any.required': 'El correo es requerido',
        }),
});
