import Joi from 'joi';

const DOCUMENT_TYPE_VALUES = ['IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER'];

// Campos de User y de Person editables, todos opcionales — base de la autoedición de perfil y
// de los schemas de gestión de usuarios (userManage.schema.ts).
export const PROFILE_FIELDS = {
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

// Autoedición del propio perfil — sin `role` ni `is_enabled` (administrativos).
export const updateOwnProfileSchema = Joi.object(PROFILE_FIELDS).min(1).messages({
    'object.min': 'Debe enviar al menos un campo para actualizar',
});
