import Joi from 'joi';

// Upsert de configuración de sucursal — horarios obligatorios, resto opcional (PUT parcial
// con min(1)). Cada regla trae su propio mensaje explícito. La comparación
// cierre > apertura vive en el service (sucursalConfig.service.ts::saveBySucursalPublicId).
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const timeField = (label: string) =>
    Joi.string().trim().pattern(TIME_PATTERN).messages({
        'string.empty': `${label} es requerido`,
        'string.pattern.base': `${label} no es válida (HH:mm)`,
        'any.required': `${label} es requerido`,
    });

const socialField = (label: string) =>
    Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(500).allow('', null).messages({
        'string.uri': `${label} debe ser una URL válida (https://...)`,
        'string.uriCustomScheme': `${label} debe empezar con http:// o https://`,
        'string.max': `${label} no puede superar 500 caracteres`,
    });

export const saveSucursalConfigSchema = Joi.object({
    social_facebook: socialField('Facebook'),
    social_instagram: socialField('Instagram'),
    social_tiktok: socialField('TikTok'),
    social_youtube: socialField('YouTube'),
    social_whatsapp: Joi.string().trim().pattern(/^\d{7,15}$/).allow('', null).messages({
        'string.pattern.base': 'Solo dígitos, entre 7 y 15 (ej: 51987654321)',
    }),
    whatsapp_message: Joi.string().trim().max(300).allow('', null).messages({
        'string.max': 'El mensaje no puede superar 300 caracteres',
    }),
    opening_time: timeField('El horario de apertura').required(),
    closing_time: timeField('El horario de cierre').required(),
    min_price: Joi.number().min(0).allow(null).messages({
        'number.base': 'El precio mínimo debe ser un número',
        'number.min': 'El precio mínimo debe ser mayor o igual a 0',
    }),
    features: Joi.string().trim().max(2000).allow('', null).messages({
        'string.max': 'Las características no pueden superar 2000 caracteres',
    }),
}).min(1).messages({
    'object.min': 'Debe enviar al menos un campo para guardar',
});
