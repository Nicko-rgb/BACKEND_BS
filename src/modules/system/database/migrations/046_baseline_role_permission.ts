/**
 * Baseline: crear tabla dsg_bss_role_permission
 * Set de permisos base de cada rol — editable desde System > Roles. Los
 * datos (qué permiso tiene cada rol) se siembran vía seeder
 * (system/database/seeders), no acá — esta migración solo crea la tabla.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_role_permission',
        module: 'system',
        order: 46
    },

    async up(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_role_permission') IS NOT NULL AS exists`,
            { transaction }
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_role_permission ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_role_permission', {
            role_permission_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            role_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_role', key: 'role_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            permission_key: {
                type: DataTypes.STRING(100),
                allowNull: false,
                references: { model: 'dsg_bss_permissions', key: 'key' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        }, { transaction });

        await queryInterface.addIndex('dsg_bss_role_permission', ['role_id', 'permission_key'], {
            unique: true, name: 'unique_role_permission', transaction,
        });
        await queryInterface.addIndex('dsg_bss_role_permission', ['permission_key'], {
            name: 'idx_role_permission_key', transaction,
        });
    },

    async down(queryInterface, _sequelize, transaction) {
        await queryInterface.dropTable('dsg_bss_role_permission', { transaction });
    }
};

module.exports = migration;
