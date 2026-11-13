import type { Booking, PaymentBooking } from '../database/models';
import { summarizePayments } from '../utils/bookingPayments';

const toPaymentDto = (payment: PaymentBooking) => ({
    paymentId: payment.payment_id,
    concept: payment.concept,
    paymentTypeId: payment.payment_type_id,
    paymentTypeName: payment.payment_type?.name ?? null,
    amount: payment.amount,
    currency: payment.moneda,
    method: payment.method,
    status: payment.status,
    paymentDate: payment.payment_date,
    createdAt: payment.created_at,
});

/**
 * Solo datos de la reserva, contacto y cobros; nunca credenciales ni configuración del proveedor.
 * `paymentSummary` deriva lo cobrado y lo pendiente de `payments` (adelanto, saldo o pago único).
 */
export const toBookingDto = (booking: Booking) => {
    const payments = [...(booking.payments ?? [])].sort((a, b) => a.payment_id - b.payment_id);
    const summary = summarizePayments(booking.total_amount, payments);

    return {
        bookingId: booking.booking_id,
        bookingDate: booking.booking_date,
        startTime: booking.start_time.slice(0, 5),
        endTime: booking.end_time.slice(0, 5),
        durationMinutes: booking.duration_minutes,
        status: booking.status,
        totalAmount: booking.total_amount,
        notes: booking.notes,
        createdAt: booking.created_at,
        client: booking.user ? {
            publicId: booking.user.public_id,
            firstName: booking.user.first_name,
            lastName: booking.user.last_name,
            phone: booking.user.phone ?? null,
            email: booking.user.email,
        } : null,
        paymentSummary: {
            currency: payments[0]?.moneda ?? null,
            paidAmount: summary.paidAmount,
            pendingAmount: summary.pendingAmount,
            status: summary.state,
        },
        payments: payments.map(toPaymentDto),
    };
};
