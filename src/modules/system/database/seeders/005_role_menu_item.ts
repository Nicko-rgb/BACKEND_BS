// Asignaciones iniciales de menús por rol; los permisos de acciones se gestionan por separado.
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { Role, MenuItem, RoleMenuItem } from '../models';

const ROLE_MENU_ITEMS: Record<string, string[]> = {
    system: [
        'dashboard',
        'companys',
        'users',
        'permissions',
        'menu_config',
        'catalogs',
        'cat_countries',
        'cat_sport_types',
        'cat_sport_cats',
        'cat_surface_types',
        'cat_payment_types',
        'cat_ubigeo',
        'cat_plans',
        'suscripciones',
        'reports',
        'statistics',
    ],
    empleado: [
        'dashboard',
        'companys',
        'bookings',
        'reports',
        'statistics',
    ],
    administrador: [
        'dashboard',
        'companys',
        'bookings',
        'suscripciones',
        'usage',
        'reports',
        'statistics',
    ],
    super_admin: [
        'dashboard',
        'companys',
        'bookings',
        'suscripciones',
        'usage',
        'reports',
        'statistics',
    ],
};

const seedFn = async (): Promise<void> => {
    const [roles, menuItems] = await Promise.all([
        Role.findAll({ attributes: ['role_id', 'key'] }),
        MenuItem.findAll({ attributes: ['menu_id', 'key'] }),
    ]);

    const roleIdByKey = new Map(roles.map((r) => [r.key, r.role_id]));
    const menuIdByKey = new Map(menuItems.map((m) => [m.key, m.menu_id]));

    // Valida las keys del mapeo contra los ítems sembrados (menuItemSeed, order 11) —
    // mismo criterio que 003_role_permission.ts con el catálogo: cortar con mensaje
    // claro en vez de reventar como FK en el bulkCreate (que tumba todo db:reset).
    const allReferencedKeys = [...new Set(Object.values(ROLE_MENU_ITEMS).flat())];
    const missingKeys = allReferencedKeys.filter((key) => !menuIdByKey.has(key));
    if (missingKeys.length > 0) {
        throw new Error(
            `roleMenuItemSeed referencia menús que no existen: ${missingKeys.join(', ')}. ` +
            `¿Se renombraron en 004_menu_item.ts sin actualizar ROLE_MENU_ITEMS acá?`
        );
    }

    const rows: { role_id: number; menu_id: number }[] = [];

    Object.entries(ROLE_MENU_ITEMS).forEach(([roleKey, menuKeys]) => {
        const roleId = roleIdByKey.get(roleKey);
        if (!roleId) return;
        menuKeys.forEach((menuKey) => {
            const menuId = menuIdByKey.get(menuKey);
            if (menuId) rows.push({ role_id: roleId, menu_id: menuId });
        });
    });

    const t = await sequelize.transaction();
    try {
        await RoleMenuItem.destroy({ truncate: true, cascade: true, restartIdentity: true, transaction: t });
        if (rows.length > 0) {
            await RoleMenuItem.bulkCreate(rows, { transaction: t });
        }
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'roleMenuItemSeed',
    seedFn,
    environment: 'essential',
    order: 47, // mismo order que su baseline (047_baseline_role_menu_item) — depende de role/menu_item
};

module.exports = config;
