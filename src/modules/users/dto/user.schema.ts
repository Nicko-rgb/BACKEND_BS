import Joi from 'joi';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';

// Roles válidos — clasificador de display, ver comentario en el modelo User.
const ROLE_VALUES = ['cliente', 'empleado', 'administrador', 'super_admin', 'system'];

// Query del listado de usuarios — page/limit de paginationQuerySchema + search (nombre o correo) +
// filtros exactos opcionales por rol y país.
export const listUsersQuerySchema = paginationQuerySchema.keys({
    search: Joi.string().trim().max(150).allow('')
        .messages({
            'string.max': 'La búsqueda no puede superar 100 caracteres',
        }),

    role: Joi.string().valid(...ROLE_VALUES).allow('')
        .messages({
            'any.only': 'El rol debe ser uno de: ' + ROLE_VALUES.join(', '),
        }),

    countryId: Joi.number().integer().positive()
        .messages({
            'number.base': 'El país seleccionado no es válido',
            'number.integer': 'El país seleccionado no es válido',
            'number.positive': 'El país seleccionado no es válido',
        }),
});

const DOCUMENT_TYPE_VALUES = ['IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER'];

// Campos de User (menos role/is_enabled) y de Person compartidos entre la edición de usuario
// (system, cualquier usuario) y la autoedición de perfil (el propio usuario) — así ninguna de
// las dos declara reglas por su cuenta ni queda desalineada con la otra.
const PROFILE_FIELDS = {
    first_name: Joi.string().trim().min(2).max(100)
        .messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede superar 100 caracteres',
        }),

    last_name: Joi.string().trim().min(2).max(100)
        .messages({
            'string.min': 'El apellido debe tener al menos 2 caracteres',
            'string.max': 'El apellido no puede superar 100 caracteres',
        }),

    // Opcional: habrá usuarios invitados que solo entran con su teléfono, sin correo.
    email: Joi.string().trim().email().allow('', null)
        .messages({ 'string.email': 'El correo no es válido' }),

    phone: Joi.string().trim().max(20).allow('', null)
        .messages({ 'string.max': 'El teléfono no puede superar 20 caracteres' }),

    country_id: Joi.number().integer().positive()
        .messages({
            'number.base': 'El país seleccionado no es válido',
            'number.integer': 'El país seleccionado no es válido',
            'number.positive': 'El país seleccionado no es válido',
        }),

    document_type: Joi.string().valid(...DOCUMENT_TYPE_VALUES).allow(null)
        .messages({ 'any.only': 'Tipo de documento no válido' }),

    document_number: Joi.string().trim().max(50).allow('', null)
        .messages({ 'string.max': 'El número de documento no puede superar 50 caracteres' }),

    // String, no Joi.date(): Joi.date() convierte a un objeto Date de JS (medianoche UTC), y
    // Sequelize lo vuelve a convertir con la zona horaria del servidor al guardar un DATEONLY —
    // con el servidor detrás de UTC (Perú es UTC-5) la fecha se corre un día para atrás.
    // Validando como string se guarda tal cual, sin ninguna conversión de por medio.
    date_birth: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .custom((value, helpers) => {
            const today = new Date().toISOString().slice(0, 10);
            return value > today ? helpers.message({ custom: 'La fecha de nacimiento no puede ser futura' }) : value;
        })
        .allow(null)
        .messages({
            'string.pattern.base': 'Formato de fecha inválido, usar YYYY-MM-DD',
        }),
};

// Edición de usuario (system, cualquier usuario) — todo opcional (PUT parcial), nunca incluye
// password. Combina campos de User (first_name/last_name/email/role/is_enabled) y de Person
// (phone/country_id/document_type/document_number) en un solo payload; el Service decide a qué
// tabla va cada uno.
export const updateUserSchema = Joi.object({
    ...PROFILE_FIELDS,

    role: Joi.string().valid(...ROLE_VALUES)
        .messages({ 'any.only': 'El rol debe ser uno de: ' + ROLE_VALUES.join(', ') }),

    is_enabled: Joi.boolean()
        .messages({ 'boolean.base': 'Habilitado debe ser verdadero o falso' }),
}).min(1).messages({
    'object.min': 'Debe enviar al menos un campo para actualizar',
});

// Autoedición del propio perfil — mismos campos que updateUserSchema salvo `role` e
// `is_enabled` (esas son administrativas, nunca las toca el propio usuario).
export const updateOwnProfileSchema = Joi.object(PROFILE_FIELDS).min(1).messages({
    'object.min': 'Debe enviar al menos un campo para actualizar',
});
