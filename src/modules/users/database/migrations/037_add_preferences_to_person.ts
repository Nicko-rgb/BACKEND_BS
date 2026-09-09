/**
 * Migración: add_preferences_to_person
 * Módulo: users
 *
 * Agrega dos columnas a dsg_bss_person:
 *   - preferences: JSONB con notificaciones/privacidad/pantalla (settings
 *     sueltos, sin necesidad relacional — mismo criterio que sports_preferences
 *     pero en JSONB para poder indexar/filtrar más adelante si hace falta).
 *   - default_payment_type_id: FK real a dsg_bss_payment_types — este sí es
 *     un dato relacional (permite JOIN), por eso no vive dentro del JSONB.
 *     ON DELETE SET NULL: si el tipo de pago se borra, la preferencia se
 *     limpia sola en vez de bloquear el borrado.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const columnExistsQuery = (column: string) => `
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dsg_bss_person' AND column_name = '${column}'
    ) AS exists
`;

const migration: MigrationFile = {
    meta: {
        description: 'add preferences to person',
        module: 'users',
        order: 37
    },

    async up(queryInterface, sequelize) {
        const [prefRows]: any = await sequelize.query(columnExistsQuery('preferences'));
        if (!prefRows[0].exists) {
            await queryInterface.addColumn('dsg_bss_person', 'preferences', {
                type: DataTypes.JSONB,
                allowNull: true
            });
        } else {
            console.log('    ⏭️  preferences ya existe en dsg_bss_person');
        }

        const [payRows]: any = await sequelize.query(columnExistsQuery('default_payment_type_id'));
        if (!payRows[0].exists) {
            await queryInterface.addColumn('dsg_bss_person', 'default_payment_type_id', {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: {
                    model: 'dsg_bss_payment_types',
                    key: 'payment_type_id'
                },
                onDelete: 'SET NULL'
            });
        } else {
            console.log('    ⏭️  default_payment_type_id ya existe en dsg_bss_person');
        }
    },

    async down(queryInterface, sequelize) {
        const [prefRows]: any = await sequelize.query(columnExistsQuery('preferences'));
        if (prefRows[0].exists) {
            await queryInterface.removeColumn('dsg_bss_person', 'preferences');
        }

        const [payRows]: any = await sequelize.query(columnExistsQuery('default_payment_type_id'));
        if (payRows[0].exists) {
            await queryInterface.removeColumn('dsg_bss_person', 'default_payment_type_id');
        }
    }
};

module.exports = migration;
