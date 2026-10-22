import type { BusinessHour } from '../database/models';

interface HourPublic {
    // Id interno de la fila — no expone datos sensibles (el bloque solo se
    // referencia dentro del alcance de su propio espacio).
    hourId: number;
    dayOfWeek: string;
    /** 'HH:mm' en 24 horas. */
    startTime: string;
    /** 'HH:mm' en 24 horas — hasta '24:00' (medianoche fin de día). */
    endTime: string;
    /** DECIMAL(10,2) viene como string de la BD. */
    price: string;
    isClosed: boolean;
    createdAt: Date;
}

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
