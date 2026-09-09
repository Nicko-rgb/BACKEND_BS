/**
 * Modelo PaymentAccount - Cuentas de pago configuradas por sucursal
 *
 * Almacena los datos específicos de cada cuenta de pago (Yape, Plin,
 * cuentas bancarias) asociados a un tipo de pago de una sucursal.
 * Permite múltiples cuentas bancarias para transferencia.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from '../../../users/database/models';
import type { Company } from './Company';
import type { ConfigurationPayment } from './ConfigurationPayment';
import type { PaymentType } from '../../../system/database/models';

type BankAccountType = 'AHORROS' | 'CORRIENTE';

export class PaymentAccount extends Model<InferAttributes<PaymentAccount>, InferCreationAttributes<PaymentAccount>> {
    declare payment_account_id: CreationOptional<number>;
    declare sucursal_id: number;
    declare payment_type_id: number;
    declare configuration_payment_id: number | null;
    declare tenant_id: string;
    declare account_alias: string | null;
    declare account_number: string | null;
    declare account_name: string | null;
    declare qr_url: string | null;
    declare bank_name: string | null;
    declare bank_account_type: BankAccountType | null;
    declare bank_account_cci: string | null;
    declare bank_currency: CreationOptional<string | null>;
    declare is_active: CreationOptional<boolean>;
    declare sort_order: CreationOptional<number | null>;
    declare user_create: number;
    declare user_update: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

PaymentAccount.init({
    payment_account_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la cuenta de pago'
    },
    sucursal_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_company', key: 'company_id' },
        comment: 'Sucursal propietaria de esta cuenta'
    },
    payment_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_payment_types', key: 'payment_type_id' },
        comment: 'Tipo de pago al que pertenece esta cuenta'
    },
    configuration_payment_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_configuration_payment', key: 'configuration_payment_id' },
        comment: 'Configuración de pago de la sucursal a la que apunta esta cuenta (ConfigurationPayment)'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Tenant para multi-tenancy'
    },
    account_alias: {
        type: DataTypes.STRING(150),
        allowNull: true,
        comment: 'Etiqueta identificadora (ej: Cuenta BCP Soles, Yape principal)'
    },
    account_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Número de teléfono (Yape/Plin) o número de cuenta bancaria'
    },
    account_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Nombre del titular de la cuenta'
    },
    qr_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL del código QR (Yape/Plin)'
    },
    bank_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Nombre del banco (BCP, BBVA, Interbank, Scotiabank)'
    },
    bank_account_type: {
        type: DataTypes.ENUM('AHORROS', 'CORRIENTE'),
        allowNull: true,
        comment: 'Tipo de cuenta bancaria'
    },
    bank_account_cci: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'Código de Cuenta Interbancario (CCI) — 20 dígitos en Perú'
    },
    bank_currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: 'PEN',
        comment: 'Moneda de la cuenta (ISO 4217: PEN, USD)'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la cuenta está activa (soft delete)'
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Orden de visualización dentro del tipo de pago'
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
    tableName: 'dsg_bss_payment_account',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
        { fields: ['sucursal_id'], name: 'idx_payment_account_sucursal' },
        { fields: ['sucursal_id', 'payment_type_id'], name: 'idx_payment_account_sucursal_type' }
    ],
    comment: 'Cuentas de pago (Yape, Plin, bancos) configuradas por sucursal'
});

export function associatePaymentAccount(models: {
    Company: typeof Company;
    User: typeof User;
    ConfigurationPayment: typeof ConfigurationPayment;
    PaymentType: typeof PaymentType;
}): void {
    PaymentAccount.belongsTo(models.Company, { foreignKey: 'sucursal_id', as: 'sucursal' });
    PaymentAccount.belongsTo(models.PaymentType, { foreignKey: 'payment_type_id', as: 'paymentType' });
    PaymentAccount.belongsTo(models.ConfigurationPayment, { foreignKey: 'configuration_payment_id', as: 'configurationPayment' });
    PaymentAccount.belongsTo(models.User, { foreignKey: 'user_create', as: 'creator' });
    PaymentAccount.belongsTo(models.User, { foreignKey: 'user_update', as: 'updater' });
}
