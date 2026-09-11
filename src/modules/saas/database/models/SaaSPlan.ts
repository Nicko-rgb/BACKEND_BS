/**
 * SaaSPlan - Catálogo de planes de suscripción SaaS
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { SaaSSubscription } from './SaaSSubscription';

export class SaaSPlan extends Model<InferAttributes<SaaSPlan>, InferCreationAttributes<SaaSPlan>> {
    declare plan_id: CreationOptional<number>;
    declare name: string;
    declare code: string;
    declare price_monthly: string;
    declare price_yearly: string;
    declare max_subsidiaries: number;
    declare max_spaces: number;
    declare max_users: number;
    declare has_stripe_connect: CreationOptional<boolean>;
    declare max_invoices_monthly: number;
    declare notifications_tier: string;
    declare has_advanced_reports: CreationOptional<boolean>;
    declare allows_multi_company: CreationOptional<boolean>;
    declare features: unknown | null;
    declare is_active: CreationOptional<boolean>;
    declare mp_plan_id_monthly: string | null;
    declare mp_plan_id_yearly: string | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    static associate(models: { SaaSSubscription: typeof SaaSSubscription }): void {
        SaaSPlan.hasMany(models.SaaSSubscription, { foreignKey: 'plan_id', as: 'subscriptions' });
    }
}

SaaSPlan.init({
    plan_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    price_monthly: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    price_yearly: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    max_subsidiaries: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    max_spaces: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    max_users: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    has_stripe_connect: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    max_invoices_monthly: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20,
        comment: 'Límite de facturas electrónicas por mes. 999 para ilimitado'
    },
    notifications_tier: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'basic',
        comment: "Nivel de notificaciones: 'basic' (solo email) | 'full' (todos los canales)"
    },
    has_advanced_reports: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si el plan incluye reportes avanzados, además de los básicos'
    },
    allows_multi_company: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si una suscripción de este plan puede cubrir más de una empresa raíz (ver SaaSSubscriptionCompany)'
    },
    features: {
        type: DataTypes.JSONB,
        allowNull: true,
        get(this: SaaSPlan) {
            const rawValue = this.getDataValue('features');
            if (typeof rawValue === 'string') {
                try { return JSON.parse(rawValue); }
                catch { return rawValue; }
            }
            return rawValue;
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    // IDs de planes en MercadoPago — se usan para crear el Preapproval del cliente ──
    mp_plan_id_monthly: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'preapproval_plan_id del plan mensual en MercadoPago'
    },
    mp_plan_id_yearly: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'preapproval_plan_id del plan anual en MercadoPago'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'SaaSPlan',
    tableName: 'dsg_bss_saas_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
