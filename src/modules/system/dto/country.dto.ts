import Joi from 'joi';
import type { Country } from '../database/models';

// Mapea el modelo Sequelize a la forma que consume el front — nunca se expone el modelo crudo.
export const toCountryDto = (country: Country, referencesCount = 0) => ({
    id: country.country_id,
    country: country.country,
    isoCountry: country.iso_country,
    phoneCode: country.phone_code,
    isoCurrency: country.iso_currency,
    currency: country.currency,
    currencySimbol: country.currency_simbol,
    timeZone: country.time_zone,
    language: country.language,
    dateFormat: country.date_format,
    flagUrl: country.flag_url,
    isActive: country.is_active,
    referencesCount,
    createdAt: country.created_at,
    updatedAt: country.updated_at,
});

// PUT reemplaza el registro completo — todos los campos son requeridos.
export const updateCountrySchema = Joi.object({
    country: Joi.string().min(2).max(100).required()
        .messages({
            'string.base': 'El nombre del país es requerido',
            'string.empty': 'El nombre del país es requerido',
            'string.min': 'El nombre del país debe tener al menos 2 caracteres',
            'string.max': 'El nombre del país no puede superar 100 caracteres',
            'any.required': 'El nombre del país es requerido',
        }),

    iso_country: Joi.string().min(2).max(3).uppercase().required()
        .messages({
            'string.base': 'El código ISO es requerido',
            'string.empty': 'El código ISO es requerido',
            'string.min': 'El código ISO debe tener al menos 2 letras (ej: AR, PE)',
            'string.max': 'El código ISO no puede superar 3 letras',
            'any.required': 'El código ISO es requerido',
        }),

    phone_code: Joi.string().max(10).required()
        .messages({
            'string.base': 'El código telefónico es requerido',
            'string.empty': 'El código telefónico es requerido',
            'string.max': 'El código telefónico no puede superar 10 caracteres',
            'any.required': 'El código telefónico es requerido',
        }),

    iso_currency: Joi.string().length(3).uppercase().required()
        .messages({
            'string.base': 'El código de moneda es requerido',
            'string.empty': 'El código de moneda es requerido',
            'string.length': 'El código de moneda debe tener exactamente 3 letras (ej: PEN, USD)',
            'any.required': 'El código de moneda es requerido',
        }),

    currency: Joi.string().min(2).max(50).required()
        .messages({
            'string.base': 'El nombre de la moneda es requerido',
            'string.empty': 'El nombre de la moneda es requerido',
            'string.min': 'El nombre de la moneda debe tener al menos 2 caracteres',
            'string.max': 'El nombre de la moneda no puede superar 50 caracteres',
            'any.required': 'El nombre de la moneda es requerido',
        }),

    currency_simbol: Joi.string().min(1).max(5).required()
        .messages({
            'string.base': 'El símbolo de moneda es requerido',
            'string.empty': 'El símbolo de moneda es requerido',
            'string.max': 'El símbolo de moneda no puede superar 5 caracteres',
            'any.required': 'El símbolo de moneda es requerido',
        }),

    time_zone: Joi.string().min(3).max(50).required()
        .messages({
            'string.base': 'La zona horaria es requerida',
            'string.empty': 'La zona horaria es requerida',
            'string.min': 'La zona horaria debe tener al menos 3 caracteres (ej: America/Lima)',
            'string.max': 'La zona horaria no puede superar 50 caracteres',
            'any.required': 'La zona horaria es requerida',
        }),

    language: Joi.string().min(2).max(10).required()
        .messages({
            'string.base': 'El idioma es requerido',
            'string.empty': 'El idioma es requerido',
            'string.min': 'El idioma debe tener al menos 2 caracteres (ej: es, en)',
            'string.max': 'El idioma no puede superar 10 caracteres',
            'any.required': 'El idioma es requerido',
        }),

    date_format: Joi.string().min(3).max(20).required()
        .messages({
            'string.base': 'El formato de fecha es requerido',
            'string.empty': 'El formato de fecha es requerido',
            'string.min': 'El formato de fecha debe tener al menos 3 caracteres (ej: DD/MM/YYYY)',
            'string.max': 'El formato de fecha no puede superar 20 caracteres',
            'any.required': 'El formato de fecha es requerido',
        }),

    flag_url: Joi.string().uri().max(255).required()
        .messages({
            'string.base': 'La URL de la bandera es requerida',
            'string.empty': 'La URL de la bandera es requerida',
            'string.uri': 'La URL de la bandera debe ser una URL válida',
            'string.max': 'La URL de la bandera no puede superar 255 caracteres',
            'any.required': 'La URL de la bandera es requerida',
        }),

    is_active: Joi.boolean().required()
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
            'any.required': 'El estado activo es requerido',
        }),
});

// POST creación — mismos campos que el PUT, salvo is_active que es opcional (default true, igual que el modelo).
export const createCountrySchema = updateCountrySchema.keys({
    is_active: Joi.boolean().default(true)
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
        }),
});
