/**
 * Migración: add_is_active_to_country
 * Módulo: system
 *
 * Agrega is_active a dsg_bss_country — solo los países activos se ofrecen
 * en los selectores públicos de ambos fronts. Default true: los países
 * existentes quedan activos automáticamente.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const columnExistsQuery = `
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dsg_bss_country' AND column_name = 'is_active'
    ) AS exists
`;

const migration: MigrationFile = {
    meta: {
        description: 'add is active to country',
        module: 'system',
        order: 35
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(columnExistsQuery);
        if (rows[0].exists) {
            console.log('    ⏭️  is_active ya existe en dsg_bss_country');
            return;
        }

        await queryInterface.addColumn('dsg_bss_country', 'is_active', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        });
    },

    async down(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(columnExistsQuery);
        if (!rows[0].exists) return;

        await queryInterface.removeColumn('dsg_bss_country', 'is_active');
    }
};

module.exports = migration;
