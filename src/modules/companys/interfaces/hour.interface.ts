/**
 * Contratos de payload de los horarios de operación del espacio — capa de
 * entrada del service. Espeja `hour.schema.ts` (mismos nombres snake_case que
 * espera el endpoint).
 */

// Días de la semana — mismo juego que el ENUM de day_of_week del modelo.
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface RegisterHourInput {
    day_of_week: DayOfWeek;
    /** 'HH:mm' en 24 horas (00:00 a 23:59) — aperturas dentro del mismo día. */
    start_time: string;
    /** 'HH:mm' en 24 horas — admite '24:00' (medianoche fin de día). */
    end_time: string;
    /** Precio por bloque configurado. */
    price: number;
}

// Actualización parcial — mismo shape que el alta, todos los campos opcionales.
export type UpdateHourInput = Partial<RegisterHourInput>;


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