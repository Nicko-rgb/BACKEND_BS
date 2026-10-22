import Joi from 'joi';

// Días de la semana — mismo juego que el ENUM day_of_week de la tabla
// dsg_bss_business_hour. El día se repite cada semana: un bloque de LUNES
// aplica a todos los lunes.
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

// 'HH:mm' en 24 horas — 00:00 a 23:59. Los horarios caen dentro del mismo día.
const HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
// El cierre además admite '24:00' (medianoche fin de día — lo acepta el TIME de Postgres).
const END_PATTERN = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

const HOUR_FIELDS = {
    day_of_week: Joi.string().valid(...DAYS)
        .messages({
            'any.only': 'El día debe ser un día de la semana válido',
            'any.required': 'El día es requerido',
        }),
    start_time: Joi.string().pattern(HOUR_PATTERN)
        .messages({
            'string.pattern.base': 'La hora de apertura debe tener formato 24 horas HH:mm (00:00 a 23:59)',
            'any.required': 'La hora de apertura es requerida',
        }),
    end_time: Joi.string().pattern(END_PATTERN)
        .messages({
            'string.pattern.base': 'La hora de cierre debe tener formato 24 horas HH:mm (hasta 24:00)',
            'any.required': 'La hora de cierre es requerida',
        }),
    price: Joi.number().min(0.01).max(99999999.99).precision(2)
        .messages({
            'number.base': 'El precio debe ser un número',
            'number.min': 'El precio debe ser mayor a 0',
            'number.max': 'El precio no puede superar 99999999.99',
            'any.required': 'El precio es requerido',
        }),
};

// Alta de un bloque de horario — is_closed siempre false al crear (el bloque
// nace habilitado); el toggleo lo maneja su propio endpoint.
export const registerHourSchema = Joi.object({
    day_of_week: HOUR_FIELDS.day_of_week.required(),
    start_time: HOUR_FIELDS.start_time.required(),
    end_time: HOUR_FIELDS.end_time.required(),
    price: HOUR_FIELDS.price.required(),
});

// Actualización de bloque — todos los campos opcionales, al menos uno.
export const updateHourSchema = Joi.object({
    day_of_week: HOUR_FIELDS.day_of_week,
    start_time: HOUR_FIELDS.start_time,
    end_time: HOUR_FIELDS.end_time,
    price: HOUR_FIELDS.price,
}).min(1);
