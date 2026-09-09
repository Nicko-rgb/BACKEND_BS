import Joi from 'joi';

// Reemplazo completo del set de permisos directos de un usuario — el checkbox picker manda
// siempre el estado final (todas las keys tildadas), no un diff.
export const updateUserPermissionsSchema = Joi.object({
    permission_keys: Joi.array().items(Joi.string()).required()
        .messages({
            'any.required': 'La lista de permisos es requerida',
        }),
});
