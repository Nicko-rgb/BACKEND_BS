import type { CreationAttributes, Transaction } from 'sequelize';
import sequelize from '../../../config/db';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import * as BookingRepository from '../repository/bookingAdmin.repository';
import * as PaymentRepository from '../repository/paymentBooking.repository';
import * as HourRepository from '../../companys/repository/hour.repository';
import * as ConfigurationRepository from '../../companys/repository/sucursalConfig.repository';
import { resolveSpaceByIdForUser, resolveSpaceForUser } from '../../companys/service/entityScope.service';
import * as UserManageBookingService from '../../users/service/userManageBooking.service';
import { DAYS_OF_WEEK } from '../../companys/interfaces/hour.interface';
import { PAYABLE_BOOKING_STATUSES } from '../interfaces/booking.interface';
import type { CreateManualBookingInput, ListSpaceBookingsQuery, PaymentConcept, RegisterBookingPaymentInput } from '../interfaces/booking.interface';
import type { PaymentBooking } from '../database/models';
import type { PaymentType } from '../../system/database/models';
import { assertFutureBooking, assertOpenSchedule, toMinutes } from '../utils/bookingTime';
import { fromCents, planCollection, planInitialPayments, summarizePayments, toCents } from '../utils/bookingPayments';

/** Cobrar dinero (adelanto, total o saldo) exige confirmar pagos; system.full_access lo cubre. */
const canConfirmPayments = (user: AuthenticatedUser): boolean =>
    user.permissions.includes('system.full_access') || user.permissions.includes('payment.confirmed');

interface PaymentRowContext {
    bookingId: number;
    paymentType: PaymentType;
    tenantId: string;
    currency: string;
    contactPhone: string | null;
    user: AuthenticatedUser;
    now: Date;
}

/** Fila de pago presencial: si queda PAID registra la fecha y, en efectivo, quién lo recibió. */
const toPaymentRow = (
    { bookingId, paymentType, tenantId, currency, contactPhone, user, now }: PaymentRowContext,
    concept: PaymentConcept,
    status: 'PAID' | 'PENDING',
    cents: number,
): CreationAttributes<PaymentBooking> => {
    const paid = status === 'PAID';
    const paidCash = paid && paymentType.category === 'efectivo';
    return {
        booking_id: bookingId, concept,
        payment_type_id: paymentType.payment_type_id, tenant_id: tenantId,
        amount: fromCents(cents), method: 'IN_PERSON', status,
        moneda: currency, comision_aplicada: '0.00',
        payment_date: paid ? now : null, contact_phone: contactPhone,
        cash_received_at: paidCash ? now : null, cash_received_by: paidCash ? user.user_id : null,
        user_create: user.user_id, user_update: null,
        payment_reference: null, transaction_id: null, payment_gateway: null, gateway_response: null,
        scheduled_payment_date: null, scheduled_payment_time: null,
        payment_proof_url: null, payment_proof_number: null, cash_receipt_number: null,
    };
};

const loadBookingDetails = async (bookingId: number, transaction: Transaction) => {
    const booking = await BookingRepository.findByIdWithDetails(bookingId, transaction);
    if (!booking) throw new NotFoundError('Reserva no encontrada');
    return booking;
};

/**
 * Reserva manual por administrador. Usuario, permisos, reserva y pagos se
 * confirman o revierten juntos. El pago puede llegar:
 *   PENDING → una fila FULL pendiente por el total.
 *   PAID    → una fila FULL cobrada por el total.
 *   DEPOSIT → una fila DEPOSIT cobrada (adelanto) + una BALANCE pendiente (saldo).
 * Cobrar dinero (DEPOSIT o PAID) exige `payment.confirmed`.
 */
export const create = async (spacePublicId: string, data: CreateManualBookingInput, user: AuthenticatedUser) => {
    if (data.payment_status !== 'PENDING' && !canConfirmPayments(user)) {
        throw new ForbiddenError('No tienes permiso para registrar pagos recibidos', { required: ['payment.confirmed'] });
    }
    // Valida el adelanto antes de tocar la BD.
    const paymentPlan = planInitialPayments(data.payment_status, data.total_amount, data.deposit_amount);

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
        const booking = await BookingRepository.create({
            user_id: client.user_id, space_id: space.space_id,
            booking_date: data.booking_date, start_time: `${data.start_time}:00`, end_time: `${data.end_time}:00`,
            duration_minutes: duration, duration_hours: (duration / 60).toFixed(2),
            status: 'CONFIRMED', payment_method: 'IN_PERSON', payment_id: null,
            total_amount: data.total_amount.toFixed(2), discount_amount: '0.00', notes: data.notes?.trim() || null,
            cancellation_reason: null, confirmed_at: now, approved_by: user.user_id, approved_at: now,
        }, transaction);

        const context: PaymentRowContext = {
            bookingId: booking.booking_id, paymentType, tenantId: space.tenant_id,
            currency: sucursal.country.iso_currency, contactPhone: client.phone, user, now,
        };
        const payments: PaymentBooking[] = [];
        for (const row of paymentPlan) {
            payments.push(await PaymentRepository.create(toPaymentRow(context, row.concept, row.status, row.cents), transaction));
        }
        // booking.payment_id sigue apuntando al primer pago registrado.
        await BookingRepository.update(booking, { payment_id: payments[0].payment_id }, transaction);

        return loadBookingDetails(booking.booking_id, transaction);
    });
};

/**
 * Cobro posterior de una reserva (ej. el saldo al llegar a la cancha), total o
 * parcial. Bloquea la reserva para serializar cobros simultáneos y mantiene
 * cobrado + pendiente = total:
 *   - Cobro del pendiente completo → la fila PENDING pasa a PAID con el tipo de pago real.
 *   - Cobro parcial → nueva fila PAID y la PENDING baja su monto.
 */
export const registerPayment = async (bookingId: number, data: RegisterBookingPaymentInput, user: AuthenticatedUser) => {
    return await sequelize.transaction(async (transaction) => {
        const booking = await BookingRepository.lockById(bookingId, transaction);
        if (!booking) throw new NotFoundError('Reserva no encontrada');

        const space = await resolveSpaceByIdForUser(booking.space_id, user);
        if (!(PAYABLE_BOOKING_STATUSES as readonly string[]).includes(booking.status)) {
            throw new BadRequestError('Solo se pueden registrar pagos en reservas pendientes o confirmadas');
        }

        const sucursal = await BookingRepository.findSucursal(space.sucursal_id, transaction);
        if (!sucursal?.country) throw new NotFoundError('Sucursal o país no encontrado');
        const paymentType = await PaymentRepository.findEnabledType(data.payment_type_id, sucursal.country_id, transaction);
        if (!paymentType) throw new BadRequestError('El tipo de pago no está disponible en el país de la sucursal');

        const payments = await PaymentRepository.findByBookingId(booking.booking_id, transaction);
        const hasPaid = payments.some((payment) => payment.status === 'PAID');
        const pendingRow = payments.find((payment) => payment.status === 'PENDING');
        // Sin fila PENDING (datos previos al libro de pagos) el pendiente se deriva del total.
        const pendingCents = pendingRow
            ? toCents(pendingRow.amount)
            : toCents(summarizePayments(booking.total_amount, payments).pendingAmount);
        const plan = planCollection(
            pendingCents,
            toCents(data.amount),
            pendingRow?.concept ?? (hasPaid ? 'BALANCE' : 'FULL'),
            hasPaid,
        );

        const now = new Date();
        const context: PaymentRowContext = {
            bookingId: booking.booking_id, paymentType, tenantId: space.tenant_id,
            currency: sucursal.country.iso_currency, contactPhone: payments[0]?.contact_phone ?? null, user, now,
        };

        if (plan.settlesPending && pendingRow) {
            const paidCash = paymentType.category === 'efectivo';
            await PaymentRepository.update(pendingRow, {
                concept: plan.paidConcept, payment_type_id: paymentType.payment_type_id,
                status: 'PAID', payment_date: now,
                cash_received_at: paidCash ? now : null, cash_received_by: paidCash ? user.user_id : null,
                user_update: user.user_id,
            }, transaction);
        } else {
            const created = await PaymentRepository.create(
                toPaymentRow(context, plan.paidConcept, 'PAID', toCents(data.amount)), transaction,
            );
            if (pendingRow) {
                await PaymentRepository.update(pendingRow, {
                    amount: fromCents(plan.remainingCents), concept: 'BALANCE', user_update: user.user_id,
                }, transaction);
            }
            if (!booking.payment_id) await BookingRepository.update(booking, { payment_id: created.payment_id }, transaction);
        }

        return loadBookingDetails(booking.booking_id, transaction);
    });
};

export const listBySpace = async (spacePublicId: string, query: ListSpaceBookingsQuery, user: AuthenticatedUser) => {
    const space = await resolveSpaceForUser(spacePublicId, user);
    return BookingRepository.listBySpace(space.space_id, query);
};
