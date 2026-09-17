import Joi from 'joi';

// Campos compartidos entre alta y edición de sucursal — la única diferencia entre los dos
// schemas de abajo es qué campos son `.required()` (alta) vs opcionales (edición, PUT
// parcial). Cada regla trae su propio mensaje explícito — nunca el texto genérico de Joi
// (ej. `"latitude" must be less than or equal to 90`), que no dice nada del problema real.
const SUCURSAL_FIELDS = {
    name: Joi.string().trim().min(2).max(200)
        .messages({
            'string.empty': 'El nombre es requerido',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede superar 200 caracteres',
            'any.required': 'El nombre es requerido',
        }),
    address: Joi.string().trim().min(5).max(255)
        .messages({
            'string.empty': 'La dirección es requerida',
            'string.min': 'La dirección debe tener al menos 5 caracteres',
            'string.max': 'La dirección no puede superar 255 caracteres',
            'any.required': 'La dirección es requerida',
        }),
    country_id: Joi.number().integer().positive()
        .messages({
            'number.base': 'El país es requerido',
            'number.integer': 'El país seleccionado no es válido',
            'number.positive': 'El país seleccionado no es válido',
            'any.required': 'El país es requerido',
        }),
    ubigeo_id: Joi.number().integer().positive()
        .messages({
            'number.base': 'El distrito es requerido',
            'number.integer': 'El distrito seleccionado no es válido',
            'number.positive': 'El distrito seleccionado no es válido',
            'any.required': 'El distrito es requerido',
        }),
    phone_cell: Joi.string().trim().max(20)
        .messages({
            'string.empty': 'El teléfono celular es requerido',
            'string.max': 'El teléfono celular no puede superar 20 caracteres',
            'any.required': 'El teléfono celular es requerido',
        }),
    phone: Joi.string().trim().max(20).allow('', null)
        .messages({
            'string.max': 'El teléfono fijo no puede superar 20 caracteres',
        }),
    latitude: Joi.number().min(-90).max(90).allow(null)
        .messages({
            'number.base': 'La latitud no es válida',
            'number.min': 'La latitud debe estar entre -90 y 90',
            'number.max': 'La latitud debe estar entre -90 y 90',
        }),
    longitude: Joi.number().min(-180).max(180).allow(null)
        .messages({
            'number.base': 'La longitud no es válida',
            'number.min': 'La longitud debe estar entre -180 y 180',
            'number.max': 'La longitud debe estar entre -180 y 180',
        }),
    description: Joi.string().trim().max(2000).allow('', null)
        .messages({
            'string.max': 'La descripción no puede superar 2000 caracteres',
        }),
    website: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(255).allow('', null)
        .messages({
            'string.uri': 'El sitio web debe ser una URL válida (https://...)',
            'string.uriCustomScheme': 'El sitio web debe empezar con http:// o https://',
            'string.max': 'El sitio web no puede superar 255 caracteres',
        }),
};

// Alta de sucursal — campos operativos (horario, precio mínimo) quedan para "Configurar" más
// adelante, todavía no existe. `document` no se pide: lo hereda de la empresa padre (ver
// sucursal.service.ts::register).
export const registerSucursalSchema = Joi.object({
    name: SUCURSAL_FIELDS.name.required(),
    address: SUCURSAL_FIELDS.address.required(),
    country_id: SUCURSAL_FIELDS.country_id.required(),
    ubigeo_id: SUCURSAL_FIELDS.ubigeo_id.required(),
    phone_cell: SUCURSAL_FIELDS.phone_cell.required(),
    phone: SUCURSAL_FIELDS.phone,
    latitude: SUCURSAL_FIELDS.latitude,
    longitude: SUCURSAL_FIELDS.longitude,
    description: SUCURSAL_FIELDS.description,
    website: SUCURSAL_FIELDS.website,
});

// Edición de sucursal — todo opcional (PUT parcial), mismos campos que el alta.
export const updateSucursalSchema = Joi.object(SUCURSAL_FIELDS).min(1).messages({
    'object.min': 'Debe enviar al menos un campo para actualizar',
});
