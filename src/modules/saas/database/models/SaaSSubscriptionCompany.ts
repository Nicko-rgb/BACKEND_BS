/**
 * SaaSSubscriptionCompany - Empresas raíz cubiertas por una suscripción SaaS
 *
 * Tabla puente muchos-a-muchos entre SaaSSubscription y Company — sostiene "Multi Empresa"
 * (plan Business): una sola suscripción puede cubrir más de una empresa raíz
 * (parent_company_id IS NULL). `is_primary` marca cuál de ellas es la titular — a esa
 * apunta SaaSInvoice.company_id al facturar (snapshot, mismo criterio que
 * plan_name/plan_code en ese modelo). Como máximo una primaria por suscripción, garantizado
 * por un índice único parcial en la migración (no por el Service).
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import type { Company } from '../../../companys/database/models';
import type { SaaSSubscription } from './SaaSSubscription';

export class SaaSSubscriptionCompany extends Model<InferAttributes<SaaSSubscriptionCompany>, InferCreationAttributes<SaaSSubscriptionCompany>> {
    declare subscription_company_id: CreationOptional<number>;
    declare subscription_id: number;
    declare company_id: number;
    declare is_primary: CreationOptional<boolean>;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    // Asociaciones (pobladas por include, no son columnas propias) ────────────
    declare subscription?: NonAttribute<SaaSSubscription>;
    declare company?: NonAttribute<Company>;

    static associate(models: { SaaSSubscription: typeof SaaSSubscription; Company: typeof Company }): void {
        SaaSSubscriptionCompany.belongsTo(models.SaaSSubscription, { foreignKey: 'subscription_id', as: 'subscription' });
        SaaSSubscriptionCompany.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
    }
}

SaaSSubscriptionCompany.init({
    subscription_company_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    subscription_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Suscripción que cubre a esta empresa'
    },
    company_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Empresa raíz cubierta (parent_company_id IS NULL — se valida en el Service)'
    },
    is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Empresa titular de la suscripción'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'SaaSSubscriptionCompany',
    tableName: 'dsg_bss_saas_subscription_company',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
