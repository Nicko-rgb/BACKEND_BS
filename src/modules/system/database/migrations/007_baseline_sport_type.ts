/**
 * Baseline: crear tabla dsg_bss_sport_type
 * Tipos de deporte (ej: Fútbol, Tenis, Vóley, etc.).
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_sport_type',
        module: 'system',
        order: 7
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_sport_type') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_sport_type ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_sport_type', {
            sport_type_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
            name: { type: DataTypes.STRING(64), allowNull: false },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_sport_type');
    }
};

module.exports = migration;
