/**
 * Baseline: crear tabla dsg_bss_role_menu_item
 * Ítems de menú visibles para cada rol — reemplaza el filtrado por
 * `menu_items.required_permission` (columna que ni existe ya, ver
 * 011_baseline_menu_item.ts). Se gestiona desde la propia página de Menú
 * (checkboxes de rol en el form de cada ítem), no desde una pantalla aparte.
 * Los datos por defecto se siembran vía seeder, no acá.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_role_menu_item',
        module: 'system',
        order: 47
    },

    async up(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_role_menu_item') IS NOT NULL AS exists`,
            { transaction }
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_role_menu_item ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_role_menu_item', {
            role_menu_item_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            role_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_role', key: 'role_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            menu_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_menu_items', key: 'menu_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        }, { transaction });

        await queryInterface.addIndex('dsg_bss_role_menu_item', ['role_id', 'menu_id'], {
            unique: true, name: 'unique_role_menu_item', transaction,
        });
        await queryInterface.addIndex('dsg_bss_role_menu_item', ['menu_id'], {
            name: 'idx_role_menu_item_menu', transaction,
        });
    },

    async down(queryInterface, _sequelize, transaction) {
        await queryInterface.dropTable('dsg_bss_role_menu_item', { transaction });
    }
};

module.exports = migration;
