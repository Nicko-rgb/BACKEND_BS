/**
 * Contratos de payload de los horarios de operación del espacio — capa de
 * entrada del service. Espeja `hour.schema.ts` (mismos nombres snake_case que
 * espera el endpoint).
 */

// Días de la semana — mismo juego que el ENUM de day_of_week del modelo. Se
// expone como const (y no solo como tipo) para que el schema Joi y el controller
// validen contra la MISMA lista: el día también llega como param de la URL.
export const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[number];

/** Nombre del día para los mensajes de error — el payload no es la UI, pero el usuario final sí lee el error. */
export const DAY_LABELS: Record<DayOfWeek, string> = {
    MONDAY: 'lunes',
    TUESDAY: 'martes',
    WEDNESDAY: 'miércoles',
    THURSDAY: 'jueves',
    FRIDAY: 'viernes',
    SATURDAY: 'sábado',
    SUNDAY: 'domingo',
};

/** Un bloque del guardado de la semana — mismo shape que un horario + su estado. */
export interface ScheduleBlockInput {
    day_of_week: DayOfWeek;
    /** 'HH:mm' en 24 horas (00:00 a 23:59) — aperturas dentro del mismo día. */
    start_time: string;
    /** 'HH:mm' en 24 horas — admite '24:00' (medianoche fin de día). */
    end_time: string;
    /** Precio por bloque configurado. */
    price: number;
    /**
     * Estado del bloque. Viaja en el guardado porque el reemplazo borra y
     * recrea la semana: sin esto, cada guardado reabriría lo que los toggles
     * cerraron. Ausente = false (nuevo bloque habilitado).
     */
    is_closed?: boolean;
}

/**
 * Guardado de la semana completa del espacio — reemplaza TODOS sus bloques.
 * Un día sin horarios es un día ausente del array; `hours: []` deja el espacio
 * sin horarios.
 */
export interface SaveScheduleInput {
    hours: ScheduleBlockInput[];
}


export interface HourPublic {
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
 * Resultado del toggle por día: el día con su estado resultante y sus bloques
 * ya actualizados — el front ajusta el switch y la lista con una sola respuesta.
 */
export interface HourDayPublic {
    day: DayOfWeek;
    isClosed: boolean;
    hours: HourPublic[];
}
