/**
 * Baseline: crear tabla dsg_bss_configuration
 * Configuración de redes sociales y WhatsApp por empresa.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_configuration',
        module: 'companys',
        order: 20
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_configuration') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_configuration ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_configuration', {
            config_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            company_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                unique: true,
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false, comment: 'Tenant raíz heredado — se duplica' },
            public_id: { type: DataTypes.STRING(36), allowNull: false, unique: true, comment: 'Identificador público único por fila' },
            social_facebook: { type: DataTypes.STRING(500), allowNull: true },
            social_instagram: { type: DataTypes.STRING(500), allowNull: true },
            social_tiktok: { type: DataTypes.STRING(500), allowNull: true },
            social_youtube: { type: DataTypes.STRING(500), allowNull: true },
            social_whatsapp: { type: DataTypes.STRING(30), allowNull: true },
            whatsapp_message: { type: DataTypes.STRING(300), allowNull: true },
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

        await queryInterface.addIndex('dsg_bss_configuration', ['public_id'], { unique: true, name: 'unique_configuration_public_id' });
        await queryInterface.addIndex('dsg_bss_configuration', ['tenant_id'], { name: 'idx_configuration_tenant' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_configuration');
    }
};

module.exports = migration;
