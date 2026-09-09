/**
 * Modelo ConfigurationPayment - Configuración de pagos de la sucursal
 *
 * Almacena información de configuración de pagos de la sucursal,
 * como tipos de pago y preferencias de pago.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from '../../../users/database/models';
import type { Company } from './Company';
import type { PaymentAccount } from './PaymentAccount';
import type { PaymentType } from '../../../system/database/models';

export class ConfigurationPayment extends Model<InferAttributes<ConfigurationPayment>, InferCreationAttributes<ConfigurationPayment>> {
    declare configuration_payment_id: CreationOptional<number>;
    declare sucursal_id: number;
    declare payment_type_id: number;
    declare tenant_id: string;
    declare is_default: CreationOptional<boolean>;
    declare sort_order: number | null;
    declare is_enabled: CreationOptional<boolean>;
    declare user_create: number;
    declare user_update: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

ConfigurationPayment.init({
    configuration_payment_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    sucursal_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID de la sucursal (el modelo Company tiene recursividad a si misma por lo que se usa sucursal_id)',
        references: { model: 'dsg_bss_company', key: 'company_id' }
    },
    payment_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID del tipo de pago',
        references: { model: 'dsg_bss_payment_types', key: 'payment_type_id' }
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Identificador del tenant para multi-tenancy'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si es el tipo de pago por defecto'
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Orden de visualización'
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el método de pago está disponible en la sucursal'
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
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_configuration_payment',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, fields: ['sucursal_id', 'payment_type_id'], name: 'unique_configuration_payment' },
        { fields: ['sucursal_id'], name: 'idx_configuration_payment_company' },
        { fields: ['payment_type_id'], name: 'idx_configuration_payment_type' }
    ],
    comment: 'Configuración de métodos de pago para sucursales(company)'
});

export function associateConfigurationPayment(models: {
    Company: typeof Company;
    User: typeof User;
    PaymentAccount: typeof PaymentAccount;
    PaymentType: typeof PaymentType;
}): void {
    ConfigurationPayment.belongsTo(models.Company, { foreignKey: 'sucursal_id', as: 'company' });
    ConfigurationPayment.belongsTo(models.PaymentType, { foreignKey: 'payment_type_id', as: 'payment_type' });
    ConfigurationPayment.belongsTo(models.User, { foreignKey: 'user_create', as: 'creator' });
    ConfigurationPayment.belongsTo(models.User, { foreignKey: 'user_update', as: 'updater' });
    ConfigurationPayment.hasMany(models.PaymentAccount, { foreignKey: 'configuration_payment_id', as: 'paymentAccounts' });
}
