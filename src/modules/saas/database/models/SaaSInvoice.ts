/**
 * SaaSInvoice - Historial de facturas/pagos de suscripciones SaaS.
 * Snapshotea nombre/código del plan porque este puede cambiar o desactivarse
 * después de emitida la factura, y el historial debe mostrar lo que se pagó
 * realmente en ese momento.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { Company } from '../../../companys/database/models';
import type { SaaSPlan } from './SaaSPlan';
import type { SaaSSubscription } from './SaaSSubscription';

export class SaaSInvoice extends Model<InferAttributes<SaaSInvoice>, InferCreationAttributes<SaaSInvoice>> {
    declare invoice_id: CreationOptional<number>;
    declare subscription_id: number;
    declare company_id: number;
    declare plan_id: number;
    declare plan_name: string;
    declare plan_code: string;
    declare billing_period: string;
    declare period_start: Date;
    declare period_end: Date;
    declare amount: string;
    declare currency: CreationOptional<string>;
    declare status: CreationOptional<string>;
    declare type: string;
    declare gateway: string;
    declare gateway_invoice_id: string | null;
    declare payer_email: string | null;
    declare paid_at: Date | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    static associate(models: { SaaSSubscription: typeof SaaSSubscription; Company: typeof Company; SaaSPlan: typeof SaaSPlan }): void {
        SaaSInvoice.belongsTo(models.SaaSSubscription, { foreignKey: 'subscription_id', as: 'subscription' });
        SaaSInvoice.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
        SaaSInvoice.belongsTo(models.SaaSPlan, { foreignKey: 'plan_id', as: 'plan' });
    }
}

SaaSInvoice.init({
    invoice_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    subscription_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Suscripción a la que pertenece esta factura'
    },
    company_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Empresa dueña de la factura (denormalizado para listar sin join extra)'
    },
    plan_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_saas_plans', key: 'plan_id' },
        onUpdate: 'CASCADE'
    },
    plan_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Snapshot del nombre del plan al momento del pago'
    },
    plan_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Snapshot del código del plan al momento del pago'
    },
    billing_period: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: "'monthly' | 'yearly'"
    },
    period_start: {
        type: DataTypes.DATE,
        allowNull: false
    },
    period_end: {
        type: DataTypes.DATE,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'PEN'
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PAID',
        comment: "'PAID' | 'GRANTED'"
    },
    type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: "'INITIAL' | 'SELF_RENEWAL' | 'ADMIN_CHANGE' | 'MANUAL'"
    },
    gateway: {
        type: DataTypes.STRING(30),
        allowNull: false,
        comment: "'MERCADOPAGO' | 'MANUAL'"
    },
    gateway_invoice_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID del pago en MercadoPago (mp_payment_id)'
    },
    payer_email: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    paid_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'SaaSInvoice',
    tableName: 'dsg_bss_saas_invoices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
