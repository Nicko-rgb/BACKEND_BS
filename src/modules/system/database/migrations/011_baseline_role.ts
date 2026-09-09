/**
 * Baseline: crear tabla dsg_bss_role
 *
 * Entidad Rol — fuente de verdad para permisos (role_permission), menú
 * (role_menu_item) y scope de datos (scope_level) de cada usuario. `order:
 * 11`, igual que menu_item (no hay dependencia entre ambas entre sí) pero
 * antes de `dsg_bss_user` (order 12), que la referencia por FK (role_id).
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_role',
        module: 'system',
        order: 11
    },

    async up(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_role') IS NOT NULL AS exists`,
            { transaction }
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_role ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_role', {
            role_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            key: { type: DataTypes.STRING(50), allowNull: false, unique: true },
            label: { type: DataTypes.STRING(100), allowNull: false },
            // 1=system (todo), 2=super_admin (sus empresas), 3=administrador (sus sucursales),
            // 4=empleado (sus sucursales). NULL en roles fuera del scope admin (ej. cliente).
            scope_level: { type: DataTypes.SMALLINT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        }, { transaction });
    },

    async down(queryInterface, _sequelize, transaction) {
        await queryInterface.dropTable('dsg_bss_role', { transaction });
    }
};

module.exports = migration;
