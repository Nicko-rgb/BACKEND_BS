/**
 * SaaSSubscription - Suscripción SaaS
 *
 * Qué empresa(s) cubre cada suscripción vive en SaaSSubscriptionCompany (tabla puente,
 * no una FK directa acá) — así una suscripción Business puede cubrir más de una empresa
 * raíz ("Multi Empresa"), y una Start/Pro cubre solo una (una sola fila en la puente).
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import { idPublicId } from '../../../../shared/utils/ids';
import type { SaaSPlan } from './SaaSPlan';
import type { SaaSSubscriptionCompany } from './SaaSSubscriptionCompany';
import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from '../../interfaces/subscription.interface';

export class SaaSSubscription extends Model<InferAttributes<SaaSSubscription>, InferCreationAttributes<SaaSSubscription>> {
    declare subscription_id: CreationOptional<number>;
    declare public_id: CreationOptional<string>;
    declare plan_id: number;
    declare status: CreationOptional<SubscriptionStatus>;
    declare is_effective: CreationOptional<boolean>;
    declare billing_period: string | null;
    declare gateway: CreationOptional<string>;
    declare mp_payment_id: string | null;
    declare mp_payer_email: string | null;
    declare mp_preapproval_id: string | null;
    declare current_period_start: Date | null;
    declare current_period_end: Date | null;
    declare cancel_at_period_end: CreationOptional<boolean>;
    declare lead_uuid: string | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    // Asociaciones (pobladas por include, no son columnas propias) ────────────
    declare plan?: NonAttribute<SaaSPlan>;
    declare subscriptionCompanies?: NonAttribute<SaaSSubscriptionCompany[]>;

    static associate(models: { SaaSPlan: typeof SaaSPlan }): void {
        SaaSSubscription.belongsTo(models.SaaSPlan, { foreignKey: 'plan_id', as: 'plan' });
    }
}

SaaSSubscription.init({
    subscription_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    public_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: () => idPublicId(),
        comment: 'Identificador público único por fila — se expone a MercadoPago (external_reference) y al frontend'
    },
    plan_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID del Plan de SaaS, catalogo de planes',
        references: { model: 'dsg_bss_saas_plans', key: 'plan_id' },
        onUpdate: 'CASCADE'
    },
    status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'TRIAL',
        validate: { isIn: [SUBSCRIPTION_STATUSES] },
        comment: 'PENDING, TRIAL, ACTIVE, PAST_DUE, CANCELED, INCOMPLETE'
    },
    is_effective: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si la suscripción aún está vigente'
    },
    billing_period: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: "'monthly' | 'yearly'"
    },
    gateway: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'MERCADOPAGO',
        comment: "Pasarela activa: 'MERCADOPAGO' | 'STRIPE'"
    },
    mp_payment_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID del pago en MercadoPago (POST /v1/payments)'
    },
    mp_payer_email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Email del pagador registrado en MercadoPago'
    },
    mp_preapproval_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID del Preapproval (suscripción) de MercadoPago — distinto de mp_payment_id, que es de un cobro suelto'
    },
    current_period_start: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de inicio del mes/año pagado'
    },
    current_period_end: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de vencimiento del mes/año pagado'
    },
    cancel_at_period_end: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Si el usuario canceló, pero puede usarlo hasta fin de mes'
    },
    lead_uuid: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'lead_uuid del seguimiento de checkout — sobrevive hasta que el webhook confirma el pago'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'SaaSSubscription',
    tableName: 'dsg_bss_saas_subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, name: 'unique_saas_subscription_public_id', fields: ['public_id'] }
    ]
});
