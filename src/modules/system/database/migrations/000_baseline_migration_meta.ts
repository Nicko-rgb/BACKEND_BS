/**
 * Baseline: crear tabla dsg_bss_migration_meta
 *
 * En la práctica esta tabla ya existe cuando esta migración llega a
 * ejecutarse: `scripts/migrationRunner.ts` la crea vía `.sync({ force: false })`
 * ANTES de poder descubrir/ejecutar cualquier migración — incluida esta
 * misma — porque necesita poder consultarla para saber qué ya corrió. Esta
 * migración existe solo para que el esquema quede versionado y visible en
 * `migrate:status`, no para crear la tabla en la práctica.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_migration_meta',
        module: 'system',
        order: 0
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_migration_meta') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_migration_meta ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_migration_meta', {
            id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
            migration_name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
            module: { type: DataTypes.STRING(50), allowNull: false },
            batch: { type: DataTypes.INTEGER, allowNull: false },
            checksum: { type: DataTypes.STRING(64), allowNull: false },
            executed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            rolled_back_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
            status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'applied' },
            execution_time_ms: { type: DataTypes.INTEGER, allowNull: true }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_migration_meta');
    }
};

module.exports = migration;
