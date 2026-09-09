/**
 * Retira company_id de dsg_bss_saas_subscriptions — esa relación ahora vive
 * 100% en dsg_bss_saas_subscription_company (migración 043), que soporta
 * que una suscripción cubra más de una empresa raíz ("Multi Empresa").
 * Dejar ambas hubiera sido tener dos fuentes de verdad para lo mismo.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Drop company_id from dsg_bss_saas_subscriptions',
        module: 'saas',
        order: 44
    },

    async up(queryInterface) {
        await queryInterface.removeColumn('dsg_bss_saas_subscriptions', 'company_id');
    },

    async down(queryInterface) {
        await queryInterface.addColumn('dsg_bss_saas_subscriptions', 'company_id', {
            type: DataTypes.BIGINT,
            allowNull: true, // no se puede volver a NOT NULL sin backfill de datos
            comment: 'ID del Tenant (Empresa Padre donde parent_company_id es null)',
            references: { model: 'dsg_bss_company', key: 'company_id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        });
        await queryInterface.addIndex('dsg_bss_saas_subscriptions', { fields: ['company_id'] });
    }
};

module.exports = migration;
