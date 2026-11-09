import type { Booking } from '../database/models';

/** Solo datos de la reserva y contacto; nunca credenciales ni configuración del proveedor. */
export const toBookingDto = (booking: Booking) => ({
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
    payment: booking.payment ? {
        paymentId: booking.payment.payment_id,
        paymentTypeId: booking.payment.payment_type_id,
        amount: booking.payment.amount,
        currency: booking.payment.moneda,
        method: booking.payment.method,
        status: booking.payment.status,
        paymentDate: booking.payment.payment_date,
    } : null,
});
