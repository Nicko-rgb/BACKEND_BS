/**
 * Migración: expandir ENUMs de dsg_bss_notification
 *
 * - notification_type: agrega BOOKING_THANK_YOU
 * - channel: agrega WHATSAPP (preparación para futuro canal WhatsApp)
 *
 * Usa ALTER TYPE ... ADD VALUE IF NOT EXISTS (PostgreSQL 9.3+)
 * para que sea idempotente y seguro en ejecuciones repetidas.
 */
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Expand notification ENUMs: add BOOKING_THANK_YOU and WHATSAPP',
        module: 'notificacions',
        order: 41
    },

    async up(queryInterface, sequelize) {
        // Verificar que la tabla existe antes de intentar alterar
        const [tableCheck]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_notification') IS NOT NULL AS exists`
        );
        if (!tableCheck[0].exists) {
            console.log('    ⏭️  dsg_bss_notification no existe — saltando migración 041');
            return;
        }

        // 1. Agregar BOOKING_THANK_YOU al ENUM de notification_type
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
                    WHERE t.typname = 'enum_dsg_bss_notification_notification_type'
                      AND e.enumlabel = 'BOOKING_THANK_YOU'
                ) THEN
                    ALTER TYPE "enum_dsg_bss_notification_notification_type"
                        ADD VALUE 'BOOKING_THANK_YOU';
                END IF;
            END$$;
        `);

        // 2. Agregar WHATSAPP al ENUM de channel
        await sequelize.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
                    WHERE t.typname = 'enum_dsg_bss_notification_channel'
                      AND e.enumlabel = 'WHATSAPP'
                ) THEN
                    ALTER TYPE "enum_dsg_bss_notification_channel"
                        ADD VALUE 'WHATSAPP';
                END IF;
            END$$;
        `);

        console.log('    ✅  ENUMs de notificación expandidos: BOOKING_THANK_YOU, WHATSAPP');
    },

    async down() {
        // PostgreSQL no soporta DROP VALUE de un ENUM directamente.
        // Para revertir habría que recrear el ENUM sin los valores y reasignar la columna.
        // Se omite por complejidad — la migración es segura y no destructiva.
        console.log('    ⚠️  Rollback no implementado para expansión de ENUMs');
    }
};

module.exports = migration;
