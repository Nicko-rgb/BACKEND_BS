/**
 * Baseline: crear tabla dsg_bss_booking_hold
 * Reservas temporales (holds) que bloquean un horario mientras el usuario paga.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_booking_hold',
        module: 'bookings',
        order: 31
    },

    async up(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_booking_hold') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_booking_hold ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_booking_hold', {
            hold_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            space_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_space', key: 'space_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            booking_date: { type: DataTypes.DATEONLY, allowNull: false },
            start_time: { type: DataTypes.TIME, allowNull: false },
            end_time: { type: DataTypes.TIME, allowNull: false },
            expires_at: { type: DataTypes.DATE, allowNull: false },
            extension_count: { type: DataTypes.INTEGER, defaultValue: 0 },
            extension_limit: { type: DataTypes.INTEGER, defaultValue: 1 },
            status: {
                type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELLED'),
                defaultValue: 'ACTIVE'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_booking_hold', ['space_id', 'booking_date', 'status'], { name: 'idx_hold_space_date_status' });
        await queryInterface.addIndex('dsg_bss_booking_hold', ['status', 'expires_at'], { name: 'idx_hold_expires_status' });
        await queryInterface.addIndex('dsg_bss_booking_hold', ['user_id', 'status'], { name: 'idx_hold_user_status' });
        await queryInterface.addIndex('dsg_bss_booking_hold', ['space_id', 'booking_date', 'start_time', 'end_time', 'status'], {
            unique: true,
            name: 'idx_hold_unique_active_slot',
            where: { status: 'ACTIVE' }
        });

        // Barrera anti doble-reserva a nivel de BD (btree_gist ya se habilita en el
        // baseline de dsg_bss_booking, que corre antes en el orden del módulo) ─────────
        await sequelize.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`, { transaction });

        await sequelize.query(
            `ALTER TABLE dsg_bss_booking_hold
             ADD CONSTRAINT excl_hold_no_overlap
             EXCLUDE USING gist (
                 space_id     WITH =,
                 booking_date WITH =,
                 numrange(
                     (EXTRACT(EPOCH FROM start_time) / 60)::numeric,
                     (EXTRACT(EPOCH FROM end_time)   / 60)::numeric
                 ) WITH &&
             ) WHERE (status = 'ACTIVE')`,
            { transaction }
        );
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_booking_hold');
    }
};

module.exports = migration;
