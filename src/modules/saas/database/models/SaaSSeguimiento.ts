/**
 * SaaSSeguimiento - Tracking de checkout abandonado (wizard de alta de empresa)
 * Sin FK real en la migración (country_id es opcional/informativo) — la
 * asociación es solo para poder incluir el nombre del país en la vista admin.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { Country } from '../../../system/database/models';

export class SaaSSeguimiento extends Model<InferAttributes<SaaSSeguimiento>, InferCreationAttributes<SaaSSeguimiento>> {
    declare seguimiento_id: CreationOptional<number>;
    declare lead_uuid: string;
    declare last_step_reached: number | null;
    declare company_name: string | null;
    declare company_document: string | null;
    declare company_address: string | null;
    declare company_phone: string | null;
    declare country_id: number | null;
    declare ubigeo_id: number | null;
    declare first_name: string | null;
    declare last_name: string | null;
    declare email: string | null;
    declare owner_phone: string | null;
    declare plan_id: number | null;
    declare plan_code: string | null;
    declare billing_period: string | null;
    declare utm_source: string | null;
    declare utm_medium: string | null;
    declare utm_campaign: string | null;
    declare referrer: string | null;
    declare language: string | null;
    declare timezone: string | null;
    declare user_agent: string | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    static associate(models: { Country: typeof Country }): void {
        SaaSSeguimiento.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country', constraints: false });
    }
}

SaaSSeguimiento.init({
    seguimiento_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    lead_uuid: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
        comment: 'UUID generado en el navegador al iniciar el checkout — clave de upsert'
    },
    last_step_reached: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    // Empresa (paso 1)
    company_name: { type: DataTypes.STRING(200), allowNull: true },
    company_document: { type: DataTypes.STRING(20), allowNull: true },
    company_address: { type: DataTypes.STRING(255), allowNull: true },
    company_phone: { type: DataTypes.STRING(20), allowNull: true },
    country_id: { type: DataTypes.BIGINT, allowNull: true },
    ubigeo_id: { type: DataTypes.BIGINT, allowNull: true },

    // Dueño (paso 2)
    first_name: { type: DataTypes.STRING(100), allowNull: true },
    last_name: { type: DataTypes.STRING(100), allowNull: true },
    email: { type: DataTypes.STRING(100), allowNull: true },
    owner_phone: { type: DataTypes.STRING(20), allowNull: true },

    // Plan de interés
    plan_id: { type: DataTypes.BIGINT, allowNull: true },
    plan_code: { type: DataTypes.STRING(30), allowNull: true },
    billing_period: { type: DataTypes.STRING(10), allowNull: true },

    // Datos pasivos
    utm_source: { type: DataTypes.STRING(100), allowNull: true },
    utm_medium: { type: DataTypes.STRING(100), allowNull: true },
    utm_campaign: { type: DataTypes.STRING(100), allowNull: true },
    referrer: { type: DataTypes.STRING(255), allowNull: true },
    language: { type: DataTypes.STRING(10), allowNull: true },
    timezone: { type: DataTypes.STRING(50), allowNull: true },
    user_agent: { type: DataTypes.STRING(255), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'SaaSSeguimiento',
    tableName: 'dsg_bss_saas_seguimiento',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
