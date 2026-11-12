/**
 * Límites de plan nullable: NULL = ilimitado.
 *
 * Reemplaza la convención anterior de "999 o más = ilimitado" por un valor explícito:
 *   - NULL      → sin límite
 *   - 0         → no incluido en el plan
 *   - número >0 → límite real
 *
 * La migración hace el backfill de los valores 999 (o mayores) existentes y recién después
 * quita el NOT NULL, así una base ya poblada queda consistente sin necesidad de db:reset.
 */
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const TABLE = 'dsg_bss_saas_plans';

const LIMIT_COLUMNS = [
    { column: 'max_subsidiaries', comment: 'Límite de sucursales. NULL = ilimitado' },
    { column: 'max_spaces', comment: 'Límite de canchas por sucursal. NULL = ilimitado' },
    { column: 'max_users', comment: 'Límite de empleados. NULL = ilimitado' },
    { column: 'max_invoices_monthly', comment: 'Límite de facturas electrónicas por mes. NULL = ilimitado' },
];

const migration: MigrationFile = {
    meta: {
        description: 'Planes SaaS: límites NULL = ilimitado y backfill de 999',
        module: 'saas',
        order: 51
    },

    async up(_queryInterface, sequelize, transaction) {
        // 1. Permitir NULL en las cuatro columnas de límites antes del backfill.
        await sequelize.query(`
            ALTER TABLE ${TABLE}
                ALTER COLUMN max_subsidiaries DROP NOT NULL,
                ALTER COLUMN max_spaces DROP NOT NULL,
                ALTER COLUMN max_users DROP NOT NULL,
                ALTER COLUMN max_invoices_monthly DROP NOT NULL
        `, { transaction });

        // 2. Backfill: el sentinel anterior (999 o más) pasa a NULL.
        await sequelize.query(`
            UPDATE ${TABLE}
            SET max_subsidiaries = CASE WHEN max_subsidiaries >= 999 THEN NULL ELSE max_subsidiaries END,
                max_spaces = CASE WHEN max_spaces >= 999 THEN NULL ELSE max_spaces END,
                max_users = CASE WHEN max_users >= 999 THEN NULL ELSE max_users END,
                max_invoices_monthly = CASE WHEN max_invoices_monthly >= 999 THEN NULL ELSE max_invoices_monthly END
            WHERE max_subsidiaries >= 999
               OR max_spaces >= 999
               OR max_users >= 999
               OR max_invoices_monthly >= 999
        `, { transaction });

        // 3. Actualizar los comentarios de columna para que la semántica quede documentada en la DB.
        for (const { column, comment } of LIMIT_COLUMNS) {
            await sequelize.query(`COMMENT ON COLUMN ${TABLE}.${column} IS :comment`, {
                replacements: { comment },
                transaction,
            });
        }
    },

    async down(_queryInterface, sequelize, transaction) {
        // Volver al sentinel anterior: todo NULL pasa a 999 antes de restaurar el NOT NULL.
        await sequelize.query(`
            UPDATE ${TABLE}
            SET max_subsidiaries = COALESCE(max_subsidiaries, 999),
                max_spaces = COALESCE(max_spaces, 999),
                max_users = COALESCE(max_users, 999),
                max_invoices_monthly = COALESCE(max_invoices_monthly, 999)
            WHERE max_subsidiaries IS NULL
               OR max_spaces IS NULL
               OR max_users IS NULL
               OR max_invoices_monthly IS NULL
        `, { transaction });

        await sequelize.query(`
            ALTER TABLE ${TABLE}
                ALTER COLUMN max_subsidiaries SET NOT NULL,
                ALTER COLUMN max_spaces SET NOT NULL,
                ALTER COLUMN max_users SET NOT NULL,
                ALTER COLUMN max_invoices_monthly SET NOT NULL
        `, { transaction });

        for (const { column } of LIMIT_COLUMNS) {
            await sequelize.query(`COMMENT ON COLUMN ${TABLE}.${column} IS '999 o más = ilimitado'`, { transaction });
        }
    }
};

module.exports = migration;
