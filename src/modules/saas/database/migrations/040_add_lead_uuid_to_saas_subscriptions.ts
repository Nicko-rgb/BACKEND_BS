/**
 * Add lead_uuid to dsg_bss_saas_subscriptions
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Add lead_uuid to dsg_bss_saas_subscriptions',
        module: 'saas',
        order: 40
    },

    async up(queryInterface) {
        await queryInterface.addColumn('dsg_bss_saas_subscriptions', 'lead_uuid', {
            type: DataTypes.STRING(36),
            allowNull: true,
            comment: 'lead_uuid del seguimiento de checkout — sobrevive hasta que el webhook confirma el pago y puede descartar el tracking'
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('dsg_bss_saas_subscriptions', 'lead_uuid');
    }
};

module.exports = migration;
