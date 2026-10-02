import Joi from 'joi';
import type { Media } from '../database/models';

// Alta de archivo — multipart: los campos llegan como strings, Joi coerciona.
// `medible_public_id` es el public_id de la entidad (nunca ids internos).
// Solo Company/Sucursal por ahora — Space/User se habilitan extendiendo
// media.service.ts::MEDIBLE_TYPES (el service rechaza el resto con 400).
export const uploadMediaSchema = Joi.object({
    medible_type: Joi.string().valid('Company', 'Sucursal').required().messages({
        'any.only': 'Tipo no soportado (Company, Sucursal)',
        'any.required': 'El tipo de entidad es requerido',
    }),
    medible_public_id: Joi.string().guid().required().messages({
        'string.guid': 'El identificador de la entidad no es válido',
        'any.required': 'El identificador de la entidad es requerido',
    }),
    category: Joi.string().valid('GALLERY', 'PROFILE', 'COVER', 'THUMBNAIL', 'DOCUMENT').messages({
        'any.only': 'Categoría no válida',
    }),
    type: Joi.string().valid('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO').messages({
        'any.only': 'Tipo de archivo no válido',
    }),
    is_primary: Joi.boolean().truthy('true').falsy('false').messages({
        'boolean.base': 'is_primary debe ser verdadero o falso',
    }),
    description: Joi.string().trim().max(2000).allow('', null).messages({
        'string.max': 'La descripción no puede superar 2000 caracteres',
    }),
});

/**
 * Archivo para el frontend — solo `public_id` (nunca `media_id`, `medible_id`
 * ni `tenant_id`). `url` es la ruta relativa (/uploads/...) servida por el backend.
 */
export const toMediaDto = (media: Media) => {
    return {
        publicId: media.public_id,
        url: media.file_url,
        fileName: media.file_name,
        type: media.type,
        category: media.category,
        isPrimary: media.is_primary,
        medibleType: media.medible_type,
    };
};
