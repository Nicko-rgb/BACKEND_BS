/**
 * BusinessHour Model - Horarios de operación de espacios deportivos
 *
 * Almacena los horarios de funcionamiento de cada espacio deportivo,
 * definiendo cuándo está disponible para reservas.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { Space } from './Space';

type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export class BusinessHour extends Model<InferAttributes<BusinessHour>, InferCreationAttributes<BusinessHour>> {
    declare hour_id: CreationOptional<number>;
    declare space_id: number;
    declare tenant_id: string;
    declare day_of_week: DayOfWeek;
    declare start_time: string;
    declare end_time: string;
    declare price: string;
    declare is_closed: CreationOptional<boolean>;
    declare user_create: number;
    declare user_update: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

BusinessHour.init({
    hour_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del horario'
    },
    space_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID del espacio al que pertenece este horario',
        references: { model: 'dsg_bss_space', key: 'space_id' }
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Identificador del tenant para multi-tenancy'
    },
    day_of_week: {
        type: DataTypes.ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
        allowNull: false,
        comment: 'Día de la semana'
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Hora de apertura'
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Hora de cierre'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Precio por hora segun horario de funcionamiento'
    },
    is_closed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si el espacio está cerrado este día'
    },
    user_create: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que creó el registro'
    },
    user_update: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que actualizó el registro'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    sequelize,
    tableName: 'dsg_bss_business_hour',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { name: 'idx_business_hour_space', fields: ['space_id'] },
        { name: 'idx_business_hour_day', fields: ['day_of_week'] }
    ],
    comment: 'Tabla de horarios de operación de espacios deportivos'
});

export function associateBusinessHour(models: { Space: typeof Space }): void {
    BusinessHour.belongsTo(models.Space, { foreignKey: 'space_id', as: 'space', onDelete: 'CASCADE' });
}
