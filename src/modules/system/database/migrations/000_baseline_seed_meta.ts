/**
 * Baseline: crear tabla dsg_bss_seed_meta
 *
 * En la práctica esta tabla ya existe cuando esta migración llega a
 * ejecutarse: `SeedMeta.runOnce()`/`getSeederStatus()` la crean vía
 * `.sync({ force: false })` antes de poder consultar qué seeds ya
 * corrieron. Esta migración existe solo para que el esquema quede
 * versionado y visible en `migrate:status`, no para crear la tabla en la
 * práctica.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_seed_meta',
        module: 'system',
        order: 0
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_seed_meta') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_seed_meta ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_seed_meta', {
            id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
            seed_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
            executed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_seed_meta');
    }
};

module.exports = migration;
