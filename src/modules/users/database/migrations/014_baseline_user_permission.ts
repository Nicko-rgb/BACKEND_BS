/**
 * Baseline: crear tabla dsg_bss_user_permissions
 * Excepciones (grant/revoke) sobre el set de permisos base del rol de cada
 * usuario (dsg_bss_role_permission) — no es el set completo de permisos del
 * usuario, ver authorizationResolver.ts.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_user_permissions',
        module: 'users',
        order: 14
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_user_permissions') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_user_permissions ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_user_permissions', {
            user_permission_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            permission_key: { type: DataTypes.STRING(100), allowNull: false },
            // grant = suma este permiso al set del rol; revoke = se lo quita
            type: { type: DataTypes.ENUM('grant', 'revoke'), allowNull: false, defaultValue: 'grant' },
            granted_by: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_user_permissions', ['user_id', 'permission_key'], { unique: true, name: 'unique_user_permission' });
        await queryInterface.addIndex('dsg_bss_user_permissions', ['user_id'], { name: 'idx_user_permission_user' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_user_permissions');
    }
};

module.exports = migration;
