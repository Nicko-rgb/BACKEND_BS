/**
 * Baseline: crear tabla dsg_bss_business_hour
 * Horarios de atención por espacio y día de la semana.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_business_hour',
        module: 'companys',
        order: 19
    },

    async up(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_business_hour') IS NOT NULL AS exists`, { transaction }
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_business_hour ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_business_hour', {
            hour_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            space_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_space', key: 'space_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            tenant_id: { type: DataTypes.UUID, allowNull: false },
            day_of_week: {
                type: DataTypes.ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
                allowNull: false
            },
            start_time: { type: DataTypes.TIME, allowNull: false },
            end_time: { type: DataTypes.TIME, allowNull: false },
            price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
            is_closed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            user_create: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_update: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        }, { transaction });

        await queryInterface.addIndex('dsg_bss_business_hour', ['space_id'], { transaction, name: 'idx_business_hour_space' });
        await queryInterface.addIndex('dsg_bss_business_hour', ['day_of_week'], { transaction, name: 'idx_business_hour_day' });

        await sequelize.query('CREATE EXTENSION IF NOT EXISTS btree_gist', { transaction });
        await sequelize.query(`
            ALTER TABLE dsg_bss_business_hour
            ADD CONSTRAINT chk_business_hour_range CHECK (end_time > start_time),
            ADD CONSTRAINT excl_business_hour_no_overlap EXCLUDE USING gist (
                space_id WITH =,
                day_of_week WITH =,
                numrange(
                    EXTRACT(EPOCH FROM start_time)::numeric,
                    EXTRACT(EPOCH FROM end_time)::numeric,
                    '[)'
                ) WITH &&
            )
        `, { transaction });
    },

    async down(queryInterface, _sequelize, transaction) {
        await queryInterface.dropTable('dsg_bss_business_hour', { transaction });
    }
};

module.exports = migration;
