/**
 * Migración: midnight_exclusion_constraints
 * Módulo: bookings
 *
 * Sin cambios efectivos — migración vacía en el backend original (placeholder
 * generado y nunca implementado). Se porta tal cual para no perder el número
 * de orden ni el registro ya aplicado en dsg_bss_migration_meta.
 */
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'midnight exclusion constraints',
        module: 'bookings',
        order: 34
    },

    async up() {
        // No-op — ver nota arriba.
    },

    async down() {
        // No-op — ver nota arriba.
    }
};

module.exports = migration;
