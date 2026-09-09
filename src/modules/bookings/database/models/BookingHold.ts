/**
 * BookingHold - Maneja los bloqueos temporales de 5-10 minutos
 * Esto evita llenar la tabla `Booking` con intentos fallidos o expirados.
 * Sin asociaciones propias — solo referencias por FK a Space/User.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

type HoldStatus = 'ACTIVE' | 'EXPIRED' | 'CONVERTED' | 'CANCELLED';

export class BookingHold extends Model<InferAttributes<BookingHold>, InferCreationAttributes<BookingHold>> {
    declare hold_id: CreationOptional<number>;
    declare space_id: number;
    declare user_id: number | null;
    declare booking_date: string;
    declare start_time: string;
    declare end_time: string;
    declare expires_at: Date;
    declare extension_count: CreationOptional<number>;
    declare extension_limit: CreationOptional<number>;
    declare status: CreationOptional<HoldStatus>;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

BookingHold.init({
    hold_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    space_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_space', key: 'space_id' }
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_user', key: 'user_id' }
    },
    booking_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    extension_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    extension_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELLED'),
        defaultValue: 'ACTIVE'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_booking_hold',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        // Query principal: disponibilidad por espacio/fecha (checkOverlap y findBySpaceAndDate)
        { name: 'idx_hold_space_date_status', fields: ['space_id', 'booking_date', 'status'] },
        // Job de expiración: busca holds activos vencidos cada N segundos
        { name: 'idx_hold_expires_status', fields: ['status', 'expires_at'] },
        // Cancelación y limpieza por usuario (deleteUserHolds, getAndDeleteUserHolds)
        { name: 'idx_hold_user_status', fields: ['user_id', 'status'] },
        // Barrera anti race-condition: evita dos holds activos para el mismo slot exacto
        { name: 'idx_hold_unique_active_slot', unique: true, fields: ['space_id', 'booking_date', 'start_time', 'end_time', 'status'] }
    ]
});
