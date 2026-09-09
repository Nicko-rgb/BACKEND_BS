/**
 * Modelo MercadoPagoCredential - Credenciales de Mercado Pago por sucursal
 *
 * Guarda el access_token (encriptado) de la cuenta de Mercado Pago que una
 * sucursal conectó para procesar sus propios cobros con tarjeta. Mientras
 * no exista un registro para una company_id dada, el sistema cae al access
 * token global de .env (ver MercadoPagoCredentialService).
 *
 * company_id debe ser una sucursal (parent_company_id NOT NULL) — es el
 * nivel donde ocurren las reservas/cobros. Una empresa principal no puede
 * conectar una cuenta acá (se valida en el Service).
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from '../../../users/database/models';
import type { Company } from './Company';

type MpEnvironment = 'SANDBOX' | 'PRODUCTION';

export class MercadoPagoCredential extends Model<InferAttributes<MercadoPagoCredential>, InferCreationAttributes<MercadoPagoCredential>> {
    declare credential_id: CreationOptional<number>;
    declare company_id: number;
    declare tenant_id: string;
    declare access_token_encrypted: string;
    declare public_key: string | null;
    declare mp_user_id: string | null;
    declare refresh_token_encrypted: string | null;
    declare token_expires_at: Date | null;
    declare environment: CreationOptional<MpEnvironment>;
    declare is_active: CreationOptional<boolean>;
    declare connected_at: Date | null;
    declare user_create: number;
    declare user_update: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

MercadoPagoCredential.init({
    credential_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la credencial'
    },
    company_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_company', key: 'company_id' },
        comment: 'Sucursal dueña de esta cuenta de Mercado Pago (no aplica a empresa principal)'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Tenant para multi-tenancy'
    },
    access_token_encrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Access token de Mercado Pago, encriptado con AES-256-GCM'
    },
    public_key: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Public key de MP — no es secreta, la usa el frontend para inicializar el Brick de tarjeta'
    },
    mp_user_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'ID de la cuenta de Mercado Pago del dueño (útil para reconciliar webhooks)'
    },
    refresh_token_encrypted: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Refresh token de Mercado Pago, encriptado (flujo OAuth Connect, a futuro)'
    },
    token_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Expiración del access_token, si el flujo OAuth Connect lo provee'
    },
    environment: {
        type: DataTypes.ENUM('SANDBOX', 'PRODUCTION'),
        allowNull: false,
        defaultValue: 'SANDBOX',
        comment: 'Ambiente de la credencial conectada'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Permite desactivar la credencial sin borrarla (vuelve al fallback de .env)'
    },
    connected_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha en que se vinculó la cuenta de Mercado Pago'
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
    tableName: 'dsg_bss_mercadopago_credential',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, fields: ['company_id'], name: 'idx_mp_credential_company_unique' }
    ],
    comment: 'Credenciales de Mercado Pago conectadas por empresa/sucursal'
});

export function associateMercadoPagoCredential(models: { Company: typeof Company; User: typeof User }): void {
    MercadoPagoCredential.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
    MercadoPagoCredential.belongsTo(models.User, { foreignKey: 'user_create', as: 'creator' });
    MercadoPagoCredential.belongsTo(models.User, { foreignKey: 'user_update', as: 'updater' });
}
