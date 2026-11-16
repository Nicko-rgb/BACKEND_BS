/**
 * Migración: efectivo-country
 * Módulo: system
 * Creada: 2026-11-16T20:52:44.998Z
 */
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Permitir tipos de pago globales y convertir CASH de Perú a global',
        module: 'system',
        order: 53
    },

    async up(queryInterface, sequelize, transaction) {
        // ALTER conserva la FK y los índices existentes.
        await sequelize.query('ALTER TABLE dsg_bss_payment_types ALTER COLUMN country_id DROP NOT NULL', { transaction });
        await queryInterface.addIndex('dsg_bss_payment_types', ['code'], {
            name: 'unique_payment_type_global_code', unique: true,
            where: { country_id: null }, transaction,
        });
        // Conserva payment_type_id y todas las referencias de cuentas y reservas.
        await sequelize.query(`
            UPDATE dsg_bss_payment_types
            SET country_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE code = 'CASH'
              AND country_id IN (SELECT country_id FROM dsg_bss_country WHERE iso_country = 'PE')
        `, { transaction });
    },

    async down(queryInterface, sequelize, transaction) {
        // No asignar automáticamente un país a métodos que ahora son globales.
        await sequelize.query(`DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM dsg_bss_payment_types WHERE country_id IS NULL) THEN
                RAISE EXCEPTION 'Asigna un país a los tipos de pago GLOBAL antes de revertir esta migración';
            END IF;
        END; $$`, { transaction });
        await queryInterface.removeIndex('dsg_bss_payment_types', 'unique_payment_type_global_code', { transaction });
        await sequelize.query('ALTER TABLE dsg_bss_payment_types ALTER COLUMN country_id SET NOT NULL', { transaction });
    }
};

module.exports = migration;
