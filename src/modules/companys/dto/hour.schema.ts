import Joi from 'joi';
import { DAYS_OF_WEEK } from '../interfaces/hour.interface';

// Días de la semana — mismo juego que el ENUM day_of_week de la tabla
// dsg_bss_business_hour. El día se repite cada semana: un bloque de LUNES
// aplica a todos los lunes.

// 'HH:mm' en 24 horas — 00:00 a 23:59. Los horarios caen dentro del mismo día.
const HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
// El cierre además admite '24:00' (medianoche fin de día — lo acepta el TIME de Postgres).
const END_PATTERN = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

const HOUR_FIELDS = {
    day_of_week: Joi.string().valid(...DAYS_OF_WEEK)
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
            'string.pattern.base': 'La hora de cierre debe tener formato 24 horas HH:mm (hasta 24:00; 00:00 también vale como fin del día)',
            'any.required': 'La hora de cierre es requerida',
        }),
    price: Joi.number().min(0.01).max(99999999.99).precision(2)
        .messages({
            'number.base': 'El precio debe ser un número',
            'number.decimala': 'Debe ser un decimal, separado por coma',
            'number.min': 'El precio debe ser mayor a 0',
            'number.max': 'El precio no puede superar 99999999.99',
            'any.required': 'El precio es requerido',
        }),
};

// Un bloque del guardado: el horario + su estado. is_closed viaja en el payload
// porque el guardado reemplaza la semana entera (si no, el reemplazo reabriría
// lo que los toggles cerraron). Ausente = false.
const SCHEDULE_BLOCK = Joi.object({
    day_of_week: HOUR_FIELDS.day_of_week.required(),
    start_time: HOUR_FIELDS.start_time.required(),
    end_time: HOUR_FIELDS.end_time.required(),
    price: HOUR_FIELDS.price.required(),
    is_closed: Joi.boolean().default(false)
        .messages({ 'boolean.base': 'El estado del bloque debe ser true o false' }),
});

// Guardado de la semana completa — reemplaza todos los bloques del espacio en
// una transacción. Un día sin horarios es un día ausente del array; [] vacía
// todos los horarios. La coherencia entre bloques (rango, solapamiento) se
// valida en el service, donde se ve el conjunto por día.
export const saveScheduleSchema = Joi.object({
    hours: Joi.array().items(SCHEDULE_BLOCK).max(50).required()
        .messages({
            'array.base': 'Los horarios deben venir en un array',
            'array.max': 'No se pueden guardar más de 50 bloques de horario',
            'any.required': 'Los horarios son requeridos',
        }),
});
