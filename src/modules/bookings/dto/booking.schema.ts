import Joi from 'joi';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';
import { BOOKING_STATUSES, INITIAL_PAYMENT_STATUSES } from '../interfaces/booking.interface';

// Importe positivo con hasta 2 decimales; `strict` no acepta strings numéricos.
const amountSchema = (label: string) => Joi.number().positive().max(99999999.99).precision(2).strict().messages({
    'number.base': `${label} debe ser un número`,
    'number.positive': `${label} debe ser mayor a 0`,
    'number.max': `${label} no puede superar 99999999.99`,
    'number.precision': `${label} admite hasta 2 decimales`,
    'any.required': `${label} es requerido`,
});

const paymentTypeIdSchema = Joi.number().integer().positive().messages({
    'number.base': 'Selecciona un tipo de pago válido',
    'number.integer': 'Selecciona un tipo de pago válido',
    'number.positive': 'Selecciona un tipo de pago válido',
    'any.required': 'El tipo de pago es requerido',
});

// DATEONLY debe seguir siendo string: se valida la fecha sin convertirla a la zona del servidor.
const dateSchema = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value: string, helpers) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (value.startsWith('0000-') || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return helpers.message({ custom: 'La fecha debe ser válida y tener formato YYYY-MM-DD' });
    }
    return value;
});

export const bookingClientSchema = Joi.object({
    first_name: Joi.string().trim().min(2).max(100).required(),
    last_name: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().trim().max(20).pattern(/^\+?[0-9][0-9 ()-]*$/).required(),
    email: Joi.string().trim().email().max(100).allow('', null),
});

export const createManualBookingSchema = Joi.object({
    client: bookingClientSchema.required(),
    booking_date: dateSchema.required(),
    start_time: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
    end_time: Joi.string().pattern(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/).required(),
    total_amount: amountSchema('El precio total').required(),
    payment_type_id: paymentTypeIdSchema.required(),
    // PENDING: nada cobrado · DEPOSIT: adelanto cobrado · PAID: total cobrado.
    payment_status: Joi.string().valid(...INITIAL_PAYMENT_STATUSES).default('PENDING').messages({
        'any.only': 'El estado del pago debe ser PENDING, DEPOSIT o PAID',
    }),
    deposit_amount: Joi.when('payment_status', {
        is: 'DEPOSIT',
        then: amountSchema('El adelanto').required(),
        otherwise: Joi.forbidden().messages({ 'any.unknown': 'El adelanto solo se envía cuando el pago es DEPOSIT' }),
    }),
    notes: Joi.string().trim().max(2000).allow('', null),
}).custom((value, helpers) => {
    if (value.end_time <= value.start_time) {
        return helpers.message({ custom: 'La hora de fin debe ser posterior al inicio; usa 24:00 para el fin del día' });
    }
    if (value.payment_status === 'DEPOSIT' && Math.round(value.deposit_amount * 100) >= Math.round(value.total_amount * 100)) {
        return helpers.message({ custom: 'El adelanto debe ser menor al precio total; si se cobró todo, registra el pago como completo' });
    }
    return value;
});

/** Cobro posterior de una reserva: el saldo completo o una parte de él. */
export const registerBookingPaymentSchema = Joi.object({
    amount: amountSchema('El monto').required(),
    payment_type_id: paymentTypeIdSchema.required(),
});

export const listSpaceBookingsSchema = paginationQuerySchema.keys({
    start_date: dateSchema.required(),
    end_date: dateSchema.required(),
    status: Joi.string().valid(...BOOKING_STATUSES),
}).custom((value, helpers) => {
    const days = (Date.parse(value.end_date) - Date.parse(value.start_date)) / 86400000;
    if (days < 0 || days > 366) {
        return helpers.message({ custom: 'El rango de fechas debe estar ordenado y no superar 366 días' });
    }
    return value;
});
