/**
 * Reglas de dinero de una reserva — funciones puras, sin BD.
 *
 * Invariante que mantienen: para una reserva vigente,
 *   suma(pagos PAID) + suma(pagos PENDING) = total_amount.
 * Los PAID son dinero ya recibido; el PENDING (a lo sumo uno) es el saldo
 * que falta cobrar. Todo se calcula en céntimos enteros para no arrastrar
 * errores de coma flotante.
 */
import { BadRequestError } from '../../../shared/errors/CustomErrors';
import type { BookingPaymentState, InitialPaymentStatus, PaymentConcept } from '../interfaces/booking.interface';

export const toCents = (amount: number | string): number => Math.round(Number(amount) * 100);
export const fromCents = (cents: number): string => (cents / 100).toFixed(2);

export interface PaymentRowPlan {
    concept: PaymentConcept;
    status: 'PAID' | 'PENDING';
    cents: number;
}

/** Filas de pago con las que nace una reserva manual. */
export const planInitialPayments = (
    status: InitialPaymentStatus,
    totalAmount: number,
    depositAmount?: number | null,
): PaymentRowPlan[] => {
    const total = toCents(totalAmount);
    if (status === 'PAID') return [{ concept: 'FULL', status: 'PAID', cents: total }];
    if (status === 'PENDING') return [{ concept: 'FULL', status: 'PENDING', cents: total }];

    const deposit = toCents(depositAmount ?? 0);
    if (deposit <= 0 || deposit >= total) {
        throw new BadRequestError('El adelanto debe ser mayor a 0 y menor al precio total');
    }
    return [
        { concept: 'DEPOSIT', status: 'PAID', cents: deposit },
        { concept: 'BALANCE', status: 'PENDING', cents: total - deposit },
    ];
};

interface PaymentLike {
    amount: string | number;
    status: string;
}

export interface PaymentSummary {
    paidAmount: string;
    pendingAmount: string;
    state: BookingPaymentState;
}

/** Cobrado vs. pendiente de una reserva a partir de sus pagos. */
export const summarizePayments = (totalAmount: string | number, payments: PaymentLike[]): PaymentSummary => {
    const total = toCents(totalAmount);
    const paid = payments
        .filter((payment) => payment.status === 'PAID')
        .reduce((sum, payment) => sum + toCents(payment.amount), 0);
    const pending = Math.max(0, total - paid);
    const state: BookingPaymentState = paid <= 0 ? 'PENDING' : pending === 0 ? 'PAID' : 'PARTIAL';
    return { paidAmount: fromCents(paid), pendingAmount: fromCents(pending), state };
};

export interface CollectionPlan {
    /** true: el pago cubre todo el pendiente y la fila PENDING pasa a PAID. */
    settlesPending: boolean;
    /** Concepto de la fila que queda cobrada (la PENDING saldada o una nueva). */
    paidConcept: PaymentConcept;
    /** Pendiente que queda después del cobro, en céntimos. */
    remainingCents: number;
}

/**
 * Cómo se aplica un cobro sobre el saldo pendiente.
 *   - Cobro del pendiente completo → la fila PENDING se salda (conserva su concepto).
 *   - Cobro parcial → se agrega una fila PAID y la PENDING baja su monto y pasa a BALANCE.
 *     El primer cobro de una reserva que no tenía nada pagado es un adelanto (DEPOSIT).
 */
export const planCollection = (
    pendingCents: number,
    amountCents: number,
    pendingConcept: PaymentConcept,
    hasPaidPayments: boolean,
): CollectionPlan => {
    if (pendingCents <= 0) throw new BadRequestError('La reserva no tiene saldo pendiente');
    if (amountCents <= 0) throw new BadRequestError('El monto debe ser mayor a 0');
    if (amountCents > pendingCents) {
        throw new BadRequestError(`El monto supera el saldo pendiente (${fromCents(pendingCents)})`);
    }
    if (amountCents === pendingCents) {
        return { settlesPending: true, paidConcept: pendingConcept, remainingCents: 0 };
    }
    return {
        settlesPending: false,
        paidConcept: hasPaidPayments ? 'BALANCE' : 'DEPOSIT',
        remainingCents: pendingCents - amountCents,
    };
};
