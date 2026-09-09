/**
 * Booking - Gestión de reservas deportivas
 *
 * Almacena información de las reservas realizadas por los usuarios
 * para espacios deportivos específicos. Incluye detalles de fecha, hora,
 * estado de la reserva y método de pago.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from '../../../users/database/models';
import type { Space, Rating } from '../../../companys/database/models';
import type { PaymentBooking } from './PaymentBooking';

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED' | 'NO_SHOW' | 'REJECTED';
type PaymentMethod = 'ONLINE' | 'IN_PERSON';

export class Booking extends Model<InferAttributes<Booking>, InferCreationAttributes<Booking>> {
    declare booking_id: CreationOptional<number>;
    declare user_id: number;
    declare space_id: number;
    declare booking_date: string;
    declare start_time: string;
    declare end_time: string;
    declare duration_minutes: number | null;
    declare duration_hours: string | null;
    declare status: CreationOptional<BookingStatus>;
    declare payment_method: PaymentMethod;
    declare payment_id: number | null;
    declare total_amount: string;
    declare discount_amount: CreationOptional<string | null>;
    declare notes: string | null;
    declare cancellation_reason: string | null;
    declare confirmed_at: Date | null;
    declare approved_by: number | null;
    declare approved_at: Date | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

Booking.init({
    booking_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la reserva'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Referencia al usuario que hace la reserva',
        references: { model: 'dsg_bss_user', key: 'user_id' }
    },
    space_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Referencia al espacio deportivo reservado'
    },
    booking_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Fecha de la reserva (YYYY-MM-DD)'
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Hora de inicio de la reserva (HH:MM:SS)'
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Hora de finalización de la reserva (HH:MM:SS)'
    },
    duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Duración de la reserva en minutos (calculado automáticamente)'
    },
    duration_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Duración de la reserva en horas'
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED', 'NO_SHOW', 'REJECTED'),
        defaultValue: 'PENDING',
        comment: 'Estado actual de la reserva'
    },
    payment_method: {
        type: DataTypes.ENUM('ONLINE', 'IN_PERSON'),
        allowNull: false,
        comment: 'Método de pago seleccionado'
    },
    payment_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Referencia al pago global de PaymentBooking',
        references: { model: 'dsg_bss_payment_booking', key: 'payment_id' }
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Monto total de la reserva'
    },
    discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Monto de descuento aplicado'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas adicionales de la reserva'
    },
    cancellation_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Razón de cancelación si aplica'
    },
    confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora de confirmación'
    },
    approved_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Usuario (admin/owner) que aprobó la reserva presencial',
        references: { model: 'dsg_bss_user', key: 'user_id' }
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora de aprobación de la reserva presencial'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_booking',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla que almacena las reservas de espacios deportivos',
    indexes: [
        // Query más crítica: disponibilidad por espacio/fecha (checkOverlap + findBySpaceAndDate)
        { name: 'idx_booking_space_date_status', fields: ['space_id', 'booking_date', 'status'] },
        // checkOverlap de intervalos de tiempo: busca CONFIRMED que se solapen
        { name: 'idx_booking_space_time_range', fields: ['space_id', 'booking_date', 'start_time', 'end_time'] },
        // Historial de reservas por usuario (panel del usuario)
        { name: 'idx_booking_user', fields: ['user_id'] },
        // Lookup pago → reservas asociadas (PaymentBooking join frecuente)
        { name: 'idx_booking_payment', fields: ['payment_id'] }
    ]
});

export function associateBooking(models: {
    User: typeof User;
    Space: typeof Space;
    PaymentBooking: typeof PaymentBooking;
    Rating: typeof Rating;
}): void {
    Booking.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Booking.belongsTo(models.Space, { foreignKey: 'space_id', as: 'space' });
    Booking.belongsTo(models.PaymentBooking, { foreignKey: 'payment_id', as: 'payment' });
    Booking.hasOne(models.Rating, { foreignKey: 'booking_id', as: 'rating' });
}
