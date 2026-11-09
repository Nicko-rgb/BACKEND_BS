import sequelize from '../../../config/db';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import * as BookingRepository from '../repository/bookingAdmin.repository';
import * as PaymentRepository from '../repository/paymentBooking.repository';
import * as HourRepository from '../../companys/repository/hour.repository';
import * as ConfigurationRepository from '../../companys/repository/sucursalConfig.repository';
import { resolveSpaceForUser } from '../../companys/service/entityScope.service';
import * as UserManageBookingService from '../../users/service/userManageBooking.service';
import { DAYS_OF_WEEK } from '../../companys/interfaces/hour.interface';
import type { CreateManualBookingInput, ListSpaceBookingsQuery } from '../interfaces/booking.interface';
import { assertFutureBooking, assertOpenSchedule, toMinutes } from '../utils/bookingTime';

/** Usuario, permisos, pago y reserva se confirman o revierten juntos. */
// Reserva manual por administrador
export const create = async (spacePublicId: string, data: CreateManualBookingInput, user: AuthenticatedUser) => {
    return await sequelize.transaction(async (transaction) => {
        // Serializa las altas manuales del espacio y sus cambios de horario.
        const space = await resolveSpaceForUser(spacePublicId, user, transaction);
        const sucursal = await BookingRepository.findSucursal(space.sucursal_id, transaction);
        if (!sucursal?.parent_company_id || !sucursal.country) throw new NotFoundError('Sucursal o país no encontrado');

        const start = toMinutes(data.start_time);
        const end = toMinutes(data.end_time);
        const duration = end - start;
        if (duration <= 0 || duration < space.minimum_booking_minutes || duration > space.maximum_booking_minutes) {
            throw new BadRequestError(`La duración debe estar entre ${space.minimum_booking_minutes} y ${space.maximum_booking_minutes} minutos`);
        }
        assertFutureBooking(data.booking_date, data.start_time, sucursal.country.time_zone);
        const config = await ConfigurationRepository.findBySucursalId(space.sucursal_id, transaction);
        if (!config?.opening_time || !config.closing_time
            || start < toMinutes(config.opening_time) || end > (toMinutes(config.closing_time) || 1440)) {
            throw new BadRequestError('La reserva está fuera del horario configurado de la sucursal');
        }
        const dayIndex = (new Date(`${data.booking_date}T00:00:00Z`).getUTCDay() + 6) % 7;
        const hours = await HourRepository.findBySpaceAndDay(space.space_id, DAYS_OF_WEEK[dayIndex], transaction);
        assertOpenSchedule(start, end, hours);

        // Respeta también la separación configurada entre reservas.
        const buffer = space.booking_buffer_minutes ?? 0;
        if (await BookingRepository.findOverlap(space.space_id, data.booking_date, data.start_time, data.end_time, transaction, buffer)) {
            throw new ConflictError('El espacio ya tiene una reserva en ese horario');
        }
        if (await BookingRepository.findActiveHold(space.space_id, data.booking_date, data.start_time, data.end_time, transaction, buffer)) {
            throw new ConflictError('El horario tiene un bloqueo temporal activo');
        }

        const paymentType = await PaymentRepository.findEnabledType(data.payment_type_id, sucursal.country_id, transaction);
        if (!paymentType) throw new BadRequestError('El tipo de pago no está disponible en el país de la sucursal');
        // if (!await PaymentRepository.findEnabledConfiguration(space.sucursal_id, data.payment_type_id, transaction)) {
        //     throw new BadRequestError('El tipo de pago no está habilitado en esta sucursal');
        // }

        const { client } = await UserManageBookingService.createBookingClient(data.client, sucursal.country_id, user, transaction);
        const now = new Date();
        const paid = data.payment_status === 'PAID';
        const paidCash = paid && paymentType.category === 'efectivo';
        const amount = data.total_amount.toFixed(2);
        const payment = await PaymentRepository.create({
            payment_type_id: paymentType.payment_type_id, tenant_id: space.tenant_id,
            amount, method: 'IN_PERSON', status: paid ? 'PAID' : 'PENDING',
            moneda: sucursal.country.iso_currency, comision_aplicada: '0.00',
            payment_date: paid ? now : null, contact_phone: client.phone,
            cash_received_at: paidCash ? now : null, cash_received_by: paidCash ? user.user_id : null,
            user_create: user.user_id, user_update: null,
            payment_reference: null, transaction_id: null, payment_gateway: null, gateway_response: null,
            scheduled_payment_date: null, scheduled_payment_time: null,
            payment_proof_url: null, payment_proof_number: null, cash_receipt_number: null,
        }, transaction);
        const booking = await BookingRepository.create({
            user_id: client.user_id, space_id: space.space_id,
            booking_date: data.booking_date, start_time: `${data.start_time}:00`, end_time: `${data.end_time}:00`,
            duration_minutes: duration, duration_hours: (duration / 60).toFixed(2),
            status: 'CONFIRMED', payment_method: 'IN_PERSON', payment_id: payment.payment_id,
            total_amount: amount, discount_amount: '0.00', notes: data.notes?.trim() || null,
            cancellation_reason: null, confirmed_at: now, approved_by: user.user_id, approved_at: now,
        }, transaction);
        booking.user = client;
        booking.payment = payment;
        return booking;
    });
};

export const listBySpace = async (spacePublicId: string, query: ListSpaceBookingsQuery, user: AuthenticatedUser) => {
    const space = await resolveSpaceForUser(spacePublicId, user);
    return BookingRepository.listBySpace(space.space_id, query);
};
