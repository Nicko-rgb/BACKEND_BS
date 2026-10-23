import type { BusinessHour } from '../database/models';
import { HourPublic } from '../interfaces/hour.interface';

/**
 * Forma de un bloque de horario para el frontend — la BD guarda 'HH:mm:ss:00'
 * y el DTO recorta a 'HH:mm' ('24:00:00' → '24:00').
 */
export const toHourDto = (hour: BusinessHour): HourPublic => ({
    hourId: hour.hour_id,
    dayOfWeek: hour.day_of_week,
    startTime: hour.start_time.slice(0, 5),
    endTime: hour.end_time.slice(0, 5),
    price: hour.price,
    isClosed: hour.is_closed,
    createdAt: hour.created_at,
});
