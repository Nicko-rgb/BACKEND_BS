/**
 * Baseline: crear tabla dsg_bss_saas_invoices
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_saas_invoices',
        module: 'saas',
        order: 42
    },

    async up(queryInterface) {
        await queryInterface.createTable('dsg_bss_saas_invoices', {
            invoice_id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            subscription_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_saas_subscriptions', key: 'subscription_id' },
                onUpdate: 'CASCADE'
            },
            company_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                comment: 'Denormalizado para listar el historial sin join extra',
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE'
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
                allowNull: false
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
                comment: 'ID del pago en MercadoPago'
            },
            payer_email: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            paid_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            }
        });

        await queryInterface.addIndex('dsg_bss_saas_invoices', ['company_id']);
        await queryInterface.addIndex('dsg_bss_saas_invoices', ['subscription_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_saas_invoices');
    }
};

module.exports = migration;
