/**
 * Baseline: crear tabla dsg_bss_saas_plans
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_saas_plans',
        module: 'saas',
        order: 27
    },

    async up(queryInterface) {
        await queryInterface.createTable('dsg_bss_saas_plans', {
            plan_id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            code: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
                comment: 'Código interno como BASIC, PRO, ENTERPRISE'
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
                allowNull: false,
                comment: 'Límite de sucursales. 999 para ilimitado'
            },
            max_spaces: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Límite de canchas por sucursal. 999 para ilimitado'
            },
            max_users: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Límite de empleados. 999 para ilimitado'
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
                comment: "Nivel de automatización de notificaciones: 'basic' | 'automated' | 'full'"
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
            has_stripe_connect: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: 'Si el plan permite procesar pagos con tarjeta'
            },
            features: {
                type: DataTypes.JSONB,
                allowNull: true,
                comment: 'Lista de características para mostrar en el frontend'
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
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
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_saas_plans');
    }
};

module.exports = migration;
