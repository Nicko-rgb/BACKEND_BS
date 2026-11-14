import type { PaginationQuery } from '../../../shared/types/pagination';
import type { CreateBookingClientInput } from '../../users/interfaces/userManageBooking.interface';

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED', 'NO_SHOW', 'REJECTED'] as const;

/** Reservas que todavía admiten cobros: las vigentes, nunca las cerradas o anuladas. */
export const PAYABLE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'] as const;

/**
 * Concepto de cada movimiento de dinero de una reserva (columna VARCHAR
 * `concept` de dsg_bss_payment_booking — esta lista es la fuente de verdad):
 *   FULL    → pago único del total.
 *   DEPOSIT → adelanto cobrado antes del saldo.
 *   BALANCE → saldo restante (o una fracción de él).
 */
export const PAYMENT_CONCEPTS = ['FULL', 'DEPOSIT', 'BALANCE'] as const;
export type PaymentConcept = typeof PAYMENT_CONCEPTS[number];

/**
 * Cómo llega el pago al registrar la reserva manual:
 *   PENDING → no se cobró nada; todo el total queda pendiente.
 *   DEPOSIT → se cobró un adelanto (`deposit_amount`); el resto queda pendiente.
 *   PAID    → se cobró el total.
 */
export const INITIAL_PAYMENT_STATUSES = ['PENDING', 'DEPOSIT', 'PAID'] as const;
export type InitialPaymentStatus = typeof INITIAL_PAYMENT_STATUSES[number];

/** Estado de cobro de la reserva, derivado de sus pagos (no se persiste). */
export type BookingPaymentState = 'PENDING' | 'PARTIAL' | 'PAID';

export interface CreateManualBookingInput {
    client: CreateBookingClientInput;
    booking_date: string;
    start_time: string;
    end_time: string;
    total_amount: number;
    payment_type_id: number;
    payment_status: InitialPaymentStatus;
    /** Solo con `payment_status = DEPOSIT`: mayor a 0 y menor al total. */
    deposit_amount?: number | null;
    notes?: string | null;
}

/** Cobro posterior de una reserva (saldo completo o una parte de él). */
export interface RegisterBookingPaymentInput {
    amount: number;
    payment_type_id: number;
}

export interface ListSpaceBookingsQuery extends PaginationQuery {
    start_date: string;
    end_date: string;
    status?: typeof BOOKING_STATUSES[number];
}
