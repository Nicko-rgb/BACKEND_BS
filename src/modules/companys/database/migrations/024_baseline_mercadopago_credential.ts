/**
 * Baseline: crear tabla dsg_bss_mercadopago_credential
 * Credenciales de Mercado Pago (access_token encriptado) por empresa/sucursal.
 * Mientras una company_id no tenga fila aquí, el sistema usa el token
 * global de .env (MP_ACCESS_TOKEN) como fallback.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_mercadopago_credential',
        module: 'companys',
        order: 24
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_mercadopago_credential') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_mercadopago_credential ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_mercadopago_credential', {
            credential_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            company_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false },
            access_token_encrypted: { type: DataTypes.TEXT, allowNull: false },
            public_key: { type: DataTypes.STRING(255), allowNull: true },
            mp_user_id: { type: DataTypes.STRING(50), allowNull: true },
            refresh_token_encrypted: { type: DataTypes.TEXT, allowNull: true },
            token_expires_at: { type: DataTypes.DATE, allowNull: true },
            environment: {
                type: DataTypes.ENUM('SANDBOX', 'PRODUCTION'),
                allowNull: false,
                defaultValue: 'SANDBOX'
            },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            connected_at: { type: DataTypes.DATE, allowNull: true },
            user_create: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_update: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_mercadopago_credential', ['company_id'], {
            name: 'idx_mp_credential_company_unique',
            unique: true
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_mercadopago_credential');
    }
};

module.exports = migration;
