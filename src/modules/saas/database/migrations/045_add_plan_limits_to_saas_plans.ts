/**
 * Agrega columnas de control por plan a dsg_bss_saas_plans — antes vivían solo como
 * texto libre en `features` (JSONB), sin forma de que el código las lea para decidir
 * nada. Mismo criterio "999 = ilimitado" que max_subsidiaries/max_spaces/max_users.
 * `notifications_tier` es STRING libre a propósito, no ENUM de Postgres — un ENUM
 * exige migración cada vez que aparece un valor nuevo.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Add plan limit columns to dsg_bss_saas_plans',
        module: 'saas',
        order: 45
    },

    async up(queryInterface) {
        await queryInterface.addColumn('dsg_bss_saas_plans', 'max_invoices_monthly', {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 20,
            comment: 'Límite de facturas electrónicas por mes. 999 para ilimitado'
        });
        await queryInterface.addColumn('dsg_bss_saas_plans', 'notifications_tier', {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'basic',
            comment: "Nivel de automatización de notificaciones: 'basic' | 'automated' | 'full'"
        });
        await queryInterface.addColumn('dsg_bss_saas_plans', 'has_advanced_reports', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Si el plan incluye reportes avanzados, además de los básicos'
        });
        await queryInterface.addColumn('dsg_bss_saas_plans', 'allows_multi_company', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Si una suscripción de este plan puede cubrir más de una empresa raíz (ver SaaSSubscriptionCompany)'
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('dsg_bss_saas_plans', 'max_invoices_monthly');
        await queryInterface.removeColumn('dsg_bss_saas_plans', 'notifications_tier');
        await queryInterface.removeColumn('dsg_bss_saas_plans', 'has_advanced_reports');
        await queryInterface.removeColumn('dsg_bss_saas_plans', 'allows_multi_company');
    }
};

module.exports = migration;
