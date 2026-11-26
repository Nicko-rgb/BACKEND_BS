import Joi from 'joi';

/**
 * Registro de la credencial de Mercado Pago de una sucursal.
 *
 * El access token es obligatorio y solo se acepta en el body: el backend lo
 * encripta antes de guardarlo y nunca lo devuelve. `public_key` no es secreta
 * (la usa el Brick en el frontend) y `environment` default SANDBOX.
 */
export const registerMercadoPagoCredentialSchema = Joi.object({
    access_token: Joi.string().trim().min(10).required().messages({
        'string.base': 'Ingrese un token de acceso válido',
        'string.empty': 'Ingrese el token de acceso',
        'string.min': 'El token de acceso no parece válido',
        'any.required': 'Ingrese el token de acceso',
    }),

    public_key: Joi.string().trim().min(10).required().messages({
        'string.base': 'Ingrese una clave pública válida',
        'string.empty': 'Ingrese la clave pública',
        'string.min': 'La clave pública no parece válida',
        'any.required': 'Ingrese la clave pública',
    }),

    environment: Joi.string().trim().valid('SANDBOX', 'PRODUCTION').required().messages({
        'string.base': 'Seleccione un entorno válido',
        'string.empty': 'Seleccione un entorno',
        'any.only': 'Seleccione el entorno de pruebas o de producción',
        'any.required': 'Seleccione un entorno',
    }),
});

export const manualPaymentAccountSchema = Joi.object({
    account_name: Joi.string().trim().max(200).required().messages({
        'string.base': 'Ingrese un nombre de cuenta válido',
        'string.empty': 'Ingrese el nombre de la cuenta',
        'string.max': 'El nombre de la cuenta no puede superar los 200 caracteres',
        'any.required': 'Ingrese el nombre de la cuenta',
    }),

    account_number: Joi.string().trim().max(50).required().messages({
        'string.base': 'Ingrese un número de cuenta válido',
        'string.empty': 'Ingrese el número de cuenta',
        'string.max': 'El número de cuenta no puede superar los 50 caracteres',
        'any.required': 'Ingrese el número de cuenta',
    }),

    account_alias: Joi.string().trim().max(150).allow('', null).messages({
        'string.base': 'Ingrese un alias válido',
        'string.max': 'El alias no puede superar los 150 caracteres',
    }),

    qr_url: Joi.forbidden().messages({
        'any.unknown': 'Adjunte una imagen del código QR en lugar de un enlace',
    }),

    remove_qr: Joi.boolean().default(false).messages({
        'boolean.base': 'La opción para eliminar el código QR no es válida',
    }),

    bank_name: Joi.string().trim().max(100).allow('', null).messages({
        'string.base': 'Ingrese un nombre de banco válido',
        'string.max': 'El nombre del banco no puede superar los 100 caracteres',
    }),
});