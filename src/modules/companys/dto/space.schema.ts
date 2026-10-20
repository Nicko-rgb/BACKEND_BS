import Joi from 'joi';

const SPACE_FIELDS = {
    name: Joi.string().trim().min(2).max(100)
        .messages({
            'string.empty': 'El nombre es requerido',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede superar 100 caracteres',
            'any.required': 'El nombre es requerido',
        }),
    surface_type_id: Joi.number().integer().positive()
        .messages({
            'number.base': 'La superficie es requerida',
            'any.required': 'La superficie es requerida',
        }),
    sport_type_id: Joi.number().integer().positive()
        .messages({
            'number.base': 'El tipo de deporte es requerido',
            'any.required': 'El tipo de deporte es requerido',
        }),
    sport_category_id: Joi.number().integer().positive()
        .messages({
            'number.base': 'La categoría deportiva es requerida',
            'any.required': 'La categoría deportiva es requerida',
        }),
    capacity: Joi.number().integer().positive().allow(null)
        .messages({
            'number.base': 'La capacidad debe ser un número',
            'number.positive': 'La capacidad debe ser mayor a 0',
        }),
    dimensions: Joi.string().trim().min(2).max(100).required()
        .messages({
            'string.empty': 'Las dimensiones son requeridas',
            'string.min': 'Las dimensiones deben tener al menos 2 caracteres',
            'string.max': 'Las dimensiones no pueden superar 100 caracteres',
            'any.required': 'Las dimensiones son requeridas',
        }),
    equipment: Joi.string().trim().max(2000).allow('', null)
        .messages({
            'string.max': 'El equipamiento no puede superar 2000 caracteres',
        }),
    minimum_booking_minutes: Joi.number().integer().positive().default(60)
        .messages({
            'number.base': 'El mínimo de reserva debe ser un número',
            'number.positive': 'El mínimo de reserva debe ser mayor a 0',
        }),
    maximum_booking_minutes: Joi.number().integer().positive().greater(Joi.ref('minimum_booking_minutes')).default(480)
        .messages({
            'number.base': 'El máximo de reserva debe ser un número',
            'number.positive': 'El máximo de reserva debe ser mayor a 0',
            'number.greater': 'El máximo de reserva debe ser mayor al mínimo',
        }),
};

// Alta de espacio — estado siempre ACTIVO al crear (igual que sucursal),
// buffer entre reservas usa el default del modelo; description no se registra.
export const registerSpaceSchema = Joi.object({
    name: SPACE_FIELDS.name.required(),
    surface_type_id: SPACE_FIELDS.surface_type_id.required(),
    sport_type_id: SPACE_FIELDS.sport_type_id.required(),
    sport_category_id: SPACE_FIELDS.sport_category_id.required(),
    capacity: SPACE_FIELDS.capacity,
    dimensions: SPACE_FIELDS.dimensions.required(),
    equipment: SPACE_FIELDS.equipment,
    minimum_booking_minutes: SPACE_FIELDS.minimum_booking_minutes,
    maximum_booking_minutes: SPACE_FIELDS.maximum_booking_minutes,
});

// Actualización de espacio — todos los campos opcionales, al menos uno requerido.
export const updateSpaceSchema = Joi.object({
    name: SPACE_FIELDS.name,
    surface_type_id: SPACE_FIELDS.surface_type_id,
    sport_type_id: SPACE_FIELDS.sport_type_id,
    sport_category_id: SPACE_FIELDS.sport_category_id,
    capacity: SPACE_FIELDS.capacity,
    dimensions: SPACE_FIELDS.dimensions,
    equipment: SPACE_FIELDS.equipment,
    minimum_booking_minutes: SPACE_FIELDS.minimum_booking_minutes,
    maximum_booking_minutes: SPACE_FIELDS.maximum_booking_minutes,
}).min(1);
