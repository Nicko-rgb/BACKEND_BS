/**
 * Migración: crear tabla dsg_bss_password_reset_token
 * Tokens de recuperación de contraseña — solo el hash SHA-256, de un solo uso y con vencimiento.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Create dsg_bss_password_reset_token',
        module: 'auth',
        order: 48
    },

    async up(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_password_reset_token') IS NOT NULL AS exists`,
            { transaction }
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_password_reset_token ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_password_reset_token', {
            reset_token_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
            expires_at: { type: DataTypes.DATE, allowNull: false },
            used_at: { type: DataTypes.DATE, allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        }, { transaction });

        await queryInterface.addIndex('dsg_bss_password_reset_token', ['user_id'], { name: 'idx_password_reset_token_user_id', transaction } as any);
        await queryInterface.addIndex('dsg_bss_password_reset_token', ['expires_at'], { name: 'idx_password_reset_token_expires_at', transaction } as any);
    },

    async down(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_password_reset_token') IS NOT NULL AS exists`,
            { transaction }
        );
        if (!rows[0].exists) {
            console.log('    ⏭️  dsg_bss_password_reset_token no existe — nada que revertir');
            return;
        }

        await queryInterface.dropTable('dsg_bss_password_reset_token', { transaction });
    }
};

module.exports = migration;
