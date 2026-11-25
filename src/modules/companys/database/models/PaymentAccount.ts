/**
 * Modelo PaymentAccount - Cuentas de pago configuradas por sucursal
 *
 * Almacena los datos específicos de cada cuenta de pago (Yape, Plin,
 * cuentas bancarias) asociados a un tipo de pago de una sucursal.
 * Una única cuenta por sucursal y tipo de pago.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from '../../../users/database/models';
import type { Company } from './Company';
import type { Media } from '../../../system/database/models/Media';
import type { PaymentType } from '../../../system/database/models';


export class PaymentAccount extends Model<InferAttributes<PaymentAccount>, InferCreationAttributes<PaymentAccount>> {
    declare payment_account_id: CreationOptional<number>;
    declare sucursal_id: number;
    declare payment_type_id: number;
    declare tenant_id: string;
    declare account_alias: string | null;
    declare account_number: string | null;
    declare account_name: string | null;
    declare qr_url: string | null;
    declare bank_name: string | null;
    declare is_active: CreationOptional<boolean>;
    declare user_create: number;
    declare user_update: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
    declare qr?: NonAttribute<Media | null>;
    declare paymentType?: NonAttribute<PaymentType>;
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
    tenant_id: {
        type: DataTypes.UUID,
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
        comment: 'Nombre del banco (BCP, BBVA, Interbank, Scotiabank, Yape)'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la cuenta está activa (soft delete)'
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
        { unique: true, fields: ['sucursal_id', 'payment_type_id'], name: 'unique_payment_account_sucursal_type' }
    ],
    comment: 'Cuentas de pago (Yape, Plin, bancos) configuradas por sucursal'
});

export function associatePaymentAccount(models: {
    Company: typeof Company;
    User: typeof User;
    PaymentType: typeof PaymentType;
    Media: typeof Media;
}): void {
    PaymentAccount.hasOne(models.Media, { foreignKey: 'medible_id', constraints: false, as: 'qr',
        scope: { medible_type: 'PaymentAccount', category: 'QR', is_primary: true } });
    PaymentAccount.belongsTo(models.Company, { foreignKey: 'sucursal_id', as: 'sucursal' });
    PaymentAccount.belongsTo(models.PaymentType, { foreignKey: 'payment_type_id', as: 'paymentType' });
    PaymentAccount.belongsTo(models.User, { foreignKey: 'user_create', as: 'creator' });
    PaymentAccount.belongsTo(models.User, { foreignKey: 'user_update', as: 'updater' });
}
