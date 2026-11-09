import Joi from 'joi';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';
import { BOOKING_STATUSES } from '../interfaces/booking.interface';

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
    total_amount: Joi.number().positive().max(99999999.99).precision(2).strict().required(),
    payment_type_id: Joi.number().integer().positive().required(),
    payment_status: Joi.string().valid('PENDING', 'PAID').default('PENDING'),
    notes: Joi.string().trim().max(2000).allow('', null),
}).custom((value, helpers) => {
    if (value.end_time <= value.start_time) {
        return helpers.message({ custom: 'La hora de fin debe ser posterior al inicio; usa 24:00 para el fin del día' });
    }
    return value;
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
