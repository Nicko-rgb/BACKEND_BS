/**
 * Baseline: crear tabla dsg_bss_saas_subscription_company
 * Tabla puente muchos-a-muchos entre SaaSSubscription y Company — sostiene "Multi Empresa"
 * (plan Business): una sola suscripción puede cubrir más de una empresa raíz.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_saas_subscription_company',
        module: 'saas',
        order: 43
    },

    async up(queryInterface) {
        await queryInterface.createTable('dsg_bss_saas_subscription_company', {
            subscription_company_id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            subscription_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                comment: 'Suscripción que cubre a esta empresa',
                references: { model: 'dsg_bss_saas_subscriptions', key: 'subscription_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            company_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                comment: 'Empresa raíz cubierta (parent_company_id IS NULL — se valida en el Service)',
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            is_primary: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Empresa titular de la suscripción — a ella apunta SaaSInvoice.company_id al facturar'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_saas_subscription_company', {
            fields: ['subscription_id', 'company_id'],
            unique: true,
            name: 'unique_saas_subscription_company'
        });
        await queryInterface.addIndex('dsg_bss_saas_subscription_company', {
            fields: ['company_id'],
            name: 'idx_saas_subscription_company_company'
        });
        // Como máximo una empresa primaria por suscripción — lo garantiza la DB (índice único parcial), no el Service.
        await queryInterface.addIndex('dsg_bss_saas_subscription_company', {
            fields: ['subscription_id'],
            unique: true,
            name: 'unique_saas_subscription_company_primary',
            where: { is_primary: true }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_saas_subscription_company');
    }
};

module.exports = migration;
