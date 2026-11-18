import Joi from 'joi';

/**
 * Registro de la credencial de Mercado Pago de una sucursal.
 *
 * El access token es obligatorio y solo se acepta en el body: el backend lo
 * encripta antes de guardarlo y nunca lo devuelve. `public_key` no es secreta
 * (la usa el Brick en el frontend) y `environment` default SANDBOX.
 */
export const registerMercadoPagoCredentialSchema = Joi.object({
    access_token: Joi.string().trim().min(10).max(500).required().messages({
        'string.empty': 'El access token es requerido',
        'string.min': 'El access token no parece válido',
        'string.max': 'El access token no puede superar 500 caracteres',
        'any.required': 'El access token es requerido',
    }),
    public_key: Joi.string().trim().max(255).allow('', null).messages({
        'string.max': 'La public key no puede superar 255 caracteres',
    }),
    environment: Joi.string().valid('SANDBOX', 'PRODUCTION').allow('', null).messages({
        'any.only': 'El ambiente debe ser SANDBOX o PRODUCTION',
    }),
});
