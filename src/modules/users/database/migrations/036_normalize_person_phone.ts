/**
 * Migración: normalize_person_phone
 * Módulo: users
 *
 * Migración de DATOS (sin cambio de esquema) — normaliza dsg_bss_person.phone
 * a dígitos puros código+número (ej: '51987654321'), listo para wa.me/, sin
 * '+' ni espacios. Antes de esto el campo tenía formatos mezclados: algunos
 * sin código de país, otros con '+51 987654321'. Idempotente: un valor que
 * ya empieza con el phone_code de su país no se vuelve a tocar.
 */
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const NORMALIZE_PHONE_SQL = `
    UPDATE dsg_bss_person p
    SET phone = CASE
        WHEN regexp_replace(p.phone, '\\D', '', 'g') LIKE regexp_replace(c.phone_code, '\\D', '', 'g') || '%'
            THEN regexp_replace(p.phone, '\\D', '', 'g')
        ELSE regexp_replace(c.phone_code, '\\D', '', 'g') || regexp_replace(p.phone, '\\D', '', 'g')
    END
    FROM dsg_bss_country c
    WHERE p.country_id = c.country_id
      AND p.phone IS NOT NULL AND p.phone <> ''
`;

const migration: MigrationFile = {
    meta: {
        description: 'normalize person phone',
        module: 'users',
        order: 36
    },

    async up(queryInterface, sequelize) {
        await sequelize.query(NORMALIZE_PHONE_SQL);
    },

    // No reversible: es un transform de datos (no de esquema), no hay forma
    // de reconstruir los formatos originales mezclados.
    async down() {
        console.warn('    ⚠️  036_normalize_person_phone no es reversible (transform de datos)');
    }
};

module.exports = migration;
