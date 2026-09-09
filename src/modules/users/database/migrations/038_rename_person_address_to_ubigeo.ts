/**
 * Migración: rename_person_address_to_ubigeo
 * Módulo: users
 *
 * dsg_bss_person.address (texto libre) sale — solo lo usa el portal cliente
 * (FRONTEND_BOOKING) y pasa a resolverse por ubigeo, igual que
 * dsg_bss_company.ubigeo_id, para poder buscar sucursales por la ubicación
 * guardada. Staff (system/super_admin/administrador/empleado) no usa este
 * campo. Sin datos que migrar: address está vacío en las filas existentes.
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
        description: 'rename person address to ubigeo',
        module: 'users',
        order: 38
    },

    async up(queryInterface, sequelize, transaction) {
        const [addressRows]: any = await sequelize.query(columnExistsQuery('address'));
        if (addressRows[0].exists) {
            await queryInterface.removeColumn('dsg_bss_person', 'address', { transaction });
        } else {
            console.log('    ⏭️  address ya no existe en dsg_bss_person');
        }

        const [ubigeoRows]: any = await sequelize.query(columnExistsQuery('ubigeo_id'));
        if (!ubigeoRows[0].exists) {
            await queryInterface.addColumn('dsg_bss_person', 'ubigeo_id', {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: {
                    model: 'dsg_bss_ubigeo',
                    key: 'ubigeo_id'
                },
                onDelete: 'SET NULL'
            }, { transaction });
        } else {
            console.log('    ⏭️  ubigeo_id ya existe en dsg_bss_person');
        }
    },

    async down(queryInterface, sequelize, transaction) {
        const [ubigeoRows]: any = await sequelize.query(columnExistsQuery('ubigeo_id'));
        if (ubigeoRows[0].exists) {
            await queryInterface.removeColumn('dsg_bss_person', 'ubigeo_id', { transaction });
        }

        const [addressRows]: any = await sequelize.query(columnExistsQuery('address'));
        if (!addressRows[0].exists) {
            await queryInterface.addColumn('dsg_bss_person', 'address', {
                type: DataTypes.TEXT,
                allowNull: true
            }, { transaction });
        }
    }
};

module.exports = migration;
