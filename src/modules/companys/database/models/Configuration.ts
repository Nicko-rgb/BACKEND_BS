/**
 * Modelo Configuration - Perfil operativo de la sucursal
 *
 * Company y Sucursal comparten la tabla dsg_bss_company (self-referencing via
 * parent_company_id), pero la configuración es SOLO de sucursales: la FK
 * sucursal_id (unique → una config por sucursal) referencia una company con
 * parent_company_id. La empresa madre no tiene configuración propia — todo es
 * por sede. El guard "solo sucursal" vive en el service, la FK sola no puede
 * distinguir el tipo de fila.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from '../../../users/database/models';
import type { Company } from './Company';

export class Configuration extends Model<InferAttributes<Configuration>, InferCreationAttributes<Configuration>> {
    declare config_id: CreationOptional<number>;
    declare sucursal_id: number;
    declare tenant_id: string;
    declare public_id: CreationOptional<string>;
    declare social_facebook: string | null;
    declare social_instagram: string | null;
    declare social_tiktok: string | null;
    declare social_youtube: string | null;
    declare social_whatsapp: string | null;
    declare whatsapp_message: string | null;
    declare opening_time: string | null;
    declare closing_time: string | null;
    declare min_price: string | null;
    declare features: string | null;
    declare user_create: number;
    declare user_update: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

Configuration.init({
    config_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la configuración'
    },
    sucursal_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
        references: { model: 'dsg_bss_company', key: 'company_id' },
        comment: 'Sucursal configurada (company con parent_company_id) — una config por sucursal'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Tenant raíz heredado — se duplica'
    },
    public_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
        defaultValue: DataTypes.UUIDV4,
        comment: 'Identificador público único por fila'
    },

    // ── Redes sociales y contacto público ───────────────────────────────────
    social_facebook: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Enlace a la página de Facebook'
    },
    social_instagram: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Enlace al perfil de Instagram'
    },
    social_tiktok: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Enlace al perfil de TikTok'
    },
    social_youtube: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Enlace al canal de YouTube'
    },
    social_whatsapp: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'Número de WhatsApp de la sucursal (solo dígitos, ej: 51987654321)'
    },
    whatsapp_message: {
        type: DataTypes.STRING(300),
        allowNull: true,
        comment: 'Mensaje predefinido para el botón de WhatsApp'
    },

    // ── Perfil operativo de la sede ──────────────────────────────────────────
    opening_time: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Horario de apertura de la sucursal'
    },
    closing_time: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Horario de cierre de la sucursal'
    },
    min_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Precio mínimo de la sucursal'
    },
    features: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Características de la sucursal (separadas por comas)'
    },

    // ── Auditoría ────────────────────────────────────────────────────────────
    user_create: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que creó la configuración'
    },
    user_update: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que actualizó la configuración'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_configuration',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    comment: 'Perfil operativo de la sucursal: redes, horarios, precio y características',
    indexes: [
        { unique: true, name: 'unique_configuration_public_id', fields: ['public_id'] },
        { name: 'idx_configuration_tenant', fields: ['tenant_id'] }
    ]
});

export function associateConfiguration(models: { Company: typeof Company; User: typeof User }): void {
    Configuration.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
    Configuration.belongsTo(models.User, { foreignKey: 'user_create', as: 'userCreate' });
    Configuration.belongsTo(models.User, { foreignKey: 'user_update', as: 'userUpdate' });
}
