/**
 * Migración: libro de pagos por reserva (adelanto + saldo)
 * Módulo: bookings
 *
 * Cada movimiento de dinero de una reserva pasa a ser una fila de
 * dsg_bss_payment_booking ligada a la reserva por `booking_id`, con su `concept`:
 *   FULL    → pago único del total (cobrado o pendiente de cobrar).
 *   DEPOSIT → adelanto cobrado al reservar.
 *   BALANCE → saldo restante (cobrado o pendiente de cobrar).
 *
 * `concept` es VARCHAR (no ENUM): sus valores válidos viven en
 * bookings/interfaces/booking.interface.ts y se agregan sin migración.
 *
 * `dsg_bss_booking.payment_id` se conserva y sigue apuntando al primer pago
 * registrado de la reserva. Los pagos existentes se vinculan a su reserva a
 * través de ese campo y quedan como FULL (un pago único por el total).
 */
import { DataTypes } from 'sequelize';
import type { QueryInterface, Sequelize, Transaction } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const TABLE = 'dsg_bss_payment_booking';
const INDEX = 'idx_payment_booking_booking';

const hasColumn = async (sequelize: Sequelize, column: string, transaction: Transaction): Promise<boolean> => {
    const [rows]: any = await sequelize.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = :table AND column_name = :column`,
        { replacements: { table: TABLE, column }, transaction }
    );
    return rows.length > 0;
};

const migration: MigrationFile = {
    meta: {
        description: 'Add booking payment ledger (booking_id + concept) to dsg_bss_payment_booking',
        module: 'bookings',
        order: 52
    },

    async up(queryInterface: QueryInterface, sequelize: Sequelize, transaction: Transaction) {
        if (!await hasColumn(sequelize, 'booking_id', transaction)) {
            await queryInterface.addColumn(TABLE, 'booking_id', {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_booking', key: 'booking_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'Reserva a la que pertenece este movimiento de dinero',
            }, { transaction });
        }

        if (!await hasColumn(sequelize, 'concept', transaction)) {
            await queryInterface.addColumn(TABLE, 'concept', {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'FULL',
                comment: 'FULL (pago único) | DEPOSIT (adelanto) | BALANCE (saldo)',
            }, { transaction });
        }

        // Vincula los pagos existentes con su reserva — hasta ahora la relación
        // solo existía en sentido inverso (booking.payment_id).
        await sequelize.query(`
            UPDATE ${TABLE} p
            SET booking_id = b.booking_id
            FROM dsg_bss_booking b
            WHERE b.payment_id = p.payment_id AND p.booking_id IS NULL
        `, { transaction });

        await sequelize.query(
            `CREATE INDEX IF NOT EXISTS ${INDEX} ON ${TABLE} (booking_id)`,
            { transaction }
        );
    },

    async down(queryInterface: QueryInterface, sequelize: Sequelize, transaction: Transaction) {
        await sequelize.query(`DROP INDEX IF EXISTS ${INDEX}`, { transaction });
        if (await hasColumn(sequelize, 'concept', transaction)) {
            await queryInterface.removeColumn(TABLE, 'concept', { transaction });
        }
        if (await hasColumn(sequelize, 'booking_id', transaction)) {
            await queryInterface.removeColumn(TABLE, 'booking_id', { transaction });
        }
    }
};

module.exports = migration;
