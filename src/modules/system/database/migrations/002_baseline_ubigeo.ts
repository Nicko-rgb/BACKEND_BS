/**
 * Baseline: crear tabla dsg_bss_ubigeo
 * Jerarquía geográfica unificada (departamento, provincia, distrito).
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_ubigeo',
        module: 'system',
        order: 2
    },

    async up(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_ubigeo') IS NOT NULL AS exists`, { transaction }
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_ubigeo ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_ubigeo', {
            ubigeo_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            code: { type: DataTypes.STRING(20), allowNull: false },
            name: { type: DataTypes.STRING(100), allowNull: false },
            level: { type: DataTypes.SMALLINT, allowNull: false },
            parent_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_ubigeo', key: 'ubigeo_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            country_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_country', key: 'country_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        }, { transaction });

        await queryInterface.addIndex('dsg_bss_ubigeo', ['country_id', 'level'], { transaction, name: 'idx_ubigeo_country_level' });
        await queryInterface.addIndex('dsg_bss_ubigeo', ['parent_id'], { transaction, name: 'idx_ubigeo_parent_id' });
        await queryInterface.addIndex('dsg_bss_ubigeo', ['code'], { transaction, unique: true, name: 'idx_ubigeo_code' });
    },

    async down(queryInterface, _sequelize, transaction) {
        await queryInterface.dropTable('dsg_bss_ubigeo', { transaction });
    }
};

module.exports = migration;
