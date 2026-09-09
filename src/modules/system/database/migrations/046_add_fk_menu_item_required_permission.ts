/**
 * Migración: add_fk_menu_item_required_permission
 * Módulo: system
 *
 * Convierte dsg_bss_menu_items.required_permission en una FK real hacia
 * dsg_bss_permissions.key (columna única) — hasta ahora era un string suelto
 * sin ningún constraint de integridad. onUpdate CASCADE porque el key de un
 * permiso se puede editar (PUT /system/permissions/:id) y así el menú sigue
 * la nueva key automáticamente. onDelete RESTRICT respalda a nivel de DB el
 * bloqueo que ya existe en PermissionService.remove.
 */
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const CONSTRAINT_NAME = 'fk_menu_item_required_permission';

const constraintExistsQuery = `
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = '${CONSTRAINT_NAME}'
    ) AS exists
`;

const migration: MigrationFile = {
    meta: {
        description: 'add FK from menu_item.required_permission to permissions.key',
        module: 'system',
        order: 46
    },

    async up(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(constraintExistsQuery, { transaction });
        if (rows[0].exists) {
            console.log('    ⏭️  fk_menu_item_required_permission ya existe');
            return;
        }

        await queryInterface.addConstraint('dsg_bss_menu_items', {
            fields: ['required_permission'],
            type: 'foreign key',
            name: CONSTRAINT_NAME,
            references: { table: 'dsg_bss_permissions', field: 'key' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
            transaction
        });
    },

    async down(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(constraintExistsQuery, { transaction });
        if (!rows[0].exists) return;

        await queryInterface.removeConstraint('dsg_bss_menu_items', CONSTRAINT_NAME, { transaction });
    }
};

module.exports = migration;
