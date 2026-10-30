import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: { description: 'Baseline: create dsg_bss_auth_session', module: 'auth', order: 49 },

    async up(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_auth_session') IS NOT NULL AS exists`,
            { transaction }
        );
        if (rows[0].exists) return;

        await queryInterface.createTable('dsg_bss_auth_session', {
            jti: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            user_id: {
                type: DataTypes.BIGINT, allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE',
            },
            expires_at: { type: DataTypes.DATE, allowNull: false },
            revoked_at: { type: DataTypes.DATE, allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        }, { transaction });
        await queryInterface.addIndex('dsg_bss_auth_session', ['user_id'], { name: 'idx_auth_session_user', transaction });
        await queryInterface.addIndex('dsg_bss_auth_session', ['expires_at'], { name: 'idx_auth_session_expiration', transaction });
    },

    async down(queryInterface, _sequelize, transaction) {
        await queryInterface.dropTable('dsg_bss_auth_session', { transaction });
    },
};

module.exports = migration;
