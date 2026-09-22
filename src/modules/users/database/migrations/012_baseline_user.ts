/**
 * Baseline: crear tabla dsg_bss_user
 * Usuarios del sistema con autenticación local y social. `role_id` (FK a
 * dsg_bss_role, creada en 011_baseline_role.ts — por eso corre antes, order 11
 * < 12) es la fuente de verdad para permisos/menú/scope de cada usuario, ver
 * authorizationResolver.ts.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_user',
        module: 'users',
        order: 12
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_user') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_user ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_user', {
            user_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            public_id: { type: DataTypes.STRING(36), allowNull: false, unique: true, comment: 'Identificador público único por fila — lo único expuesto en URLs' },
            first_name: { type: DataTypes.STRING(100), allowNull: true },
            last_name: { type: DataTypes.STRING(100), allowNull: true },
            email: { type: DataTypes.STRING(100), allowNull: true, unique: true },
            password: { type: DataTypes.STRING(255), allowNull: true },
            password_changed_at: { type: DataTypes.DATE, allowNull: true },
            social_id: { type: DataTypes.STRING(255), allowNull: true },
            social_provider: { type: DataTypes.STRING(50), allowNull: true },
            role_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_role', key: 'role_id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },
            is_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            user_create: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_user', ['social_provider', 'social_id'], { name: 'idx_user_social_provider_id' });
        await queryInterface.addIndex('dsg_bss_user', ['public_id'], { unique: true, name: 'unique_user_public_id' });
        await queryInterface.addIndex('dsg_bss_user', ['is_enabled'], { name: 'idx_user_is_enabled' });
        await queryInterface.addIndex('dsg_bss_user', ['role_id'], { name: 'idx_user_role_id' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_user');
    }
};

module.exports = migration;
