/**
 * Baseline: crear tabla dsg_bss_saas_subscriptions
 * Sin company_id — esa relación vive 100% en dsg_bss_saas_subscription_company
 * (soporta que una suscripción cubra más de una empresa raíz, plan "Multi Empresa").
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_saas_subscriptions',
        module: 'saas',
        order: 28
    },

    async up(queryInterface) {
        await queryInterface.createTable('dsg_bss_saas_subscriptions', {
            subscription_id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            public_id: {
                type: DataTypes.STRING(36),
                allowNull: false,
                unique: true,
                comment: 'Identificador público único por fila — se expone a MercadoPago (external_reference) y al frontend'
            },
            plan_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_saas_plans', key: 'plan_id' },
                onUpdate: 'CASCADE'
            },
            billing_period: {
                type: DataTypes.STRING(10),
                allowNull: true
            },
            status: {
                type: DataTypes.STRING(30),
                allowNull: false,
                defaultValue: 'TRIAL',
                comment: 'TRIAL, ACTIVE, PAST_DUE, CANCELED, INCOMPLETE'
            },
            stripe_customer_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: 'ID del cliente en Stripe'
            },
            stripe_subscription_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: 'ID de la suscripción en Stripe Billing'
            },
            current_period_start: {
                type: DataTypes.DATE,
                allowNull: true
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
            gateway: {
                type: DataTypes.STRING(30),
                allowNull: false,
                defaultValue: 'STRIPE',
                comment: "'STRIPE' | 'MERCADOPAGO'"
            },
            mp_payment_id: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            mp_preapproval_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: 'ID del Preapproval en MercadoPago'
            },
            mp_payer_email: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: 'Email del pagador registrado en MercadoPago'
            },
            lead_uuid: {
                type: DataTypes.STRING(36),
                allowNull: true,
                comment: 'lead_uuid del seguimiento de checkout — sobrevive hasta que el webhook confirma el pago'
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

        await queryInterface.addIndex('dsg_bss_saas_subscriptions', ['stripe_subscription_id']);
        await queryInterface.addIndex('dsg_bss_saas_subscriptions', ['public_id'], { unique: true, name: 'unique_saas_subscription_public_id' });
        // Índice para buscar suscripciones MP por preapproval_id (webhook) ───────────
        await queryInterface.addIndex('dsg_bss_saas_subscriptions', ['mp_preapproval_id'], {
            name: 'idx_saas_sub_mp_preapproval_id'
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_saas_subscriptions');
    }
};

module.exports = migration;
