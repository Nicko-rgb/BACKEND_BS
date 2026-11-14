import type { CreationAttributes, InferAttributes, Transaction } from 'sequelize';
import { PaymentBooking } from '../database/models';
import { ConfigurationPayment } from '../../companys/database/models';
import { PaymentType } from '../../system/database/models';

export const findEnabledType = (paymentTypeId: number, countryId: number, transaction: Transaction) => PaymentType.findOne({
    where: { payment_type_id: paymentTypeId, country_id: countryId, is_enabled: true }, transaction,
});

export const findEnabledConfiguration = (sucursalId: number, paymentTypeId: number, transaction: Transaction) => ConfigurationPayment.findOne({
    where: { sucursal_id: sucursalId, payment_type_id: paymentTypeId, is_enabled: true }, transaction,
});

export const create = (data: CreationAttributes<PaymentBooking>, transaction: Transaction) => PaymentBooking.create(data, { transaction });

// Pagos de una reserva en orden de registro — el llamador ya bloqueó la reserva.
export const findByBookingId = (bookingId: number, transaction: Transaction) => PaymentBooking.findAll({
    where: { booking_id: bookingId }, order: [['payment_id', 'ASC']], transaction,
});

export const update = (payment: PaymentBooking, data: Partial<InferAttributes<PaymentBooking>>, transaction: Transaction) => payment.update(data, { transaction });
