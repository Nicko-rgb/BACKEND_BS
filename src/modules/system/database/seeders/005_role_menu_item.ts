/**
 * Seed: roles asignados a cada ítem de menú (dsg_bss_role_menu_item).
 * Corre después de roleSeed (order 11), menuItemSeed (order 11) y
 * rolePermissionSeed (order 46) — necesita las tres tablas ya sembradas.
 *
 * Cómo se calculó la asignación inicial: la base anterior (db_sport) todavía
 * tenía `menu_items.required_permission` — acá abajo está ese valor histórico
 * por key (ninguna tabla nueva lo guarda, esa columna ya no existe), ya
 * traducido a las keys reales del catálogo nuevo (001_permission_catalog.ts).
 * Un ítem queda asignado a un rol si esa key está en el set de permisos que
 * rolePermissionSeed ya le dio a ese rol (o si el ítem no tenía
 * required_permission, en cuyo caso quedaba visible para cualquier logueado
 * → acá, para todos los roles activos). `system` se agrega siempre — ve todo
 * sin excepción (ver menu.service.ts::getMenuForUser), se backfillea acá
 * nomás para que la UI de administración lo refleje explícitamente.
 *
 * Con esta regla mecánica, varios ítems quedan sin ningún rol asignado más
 * allá de system (users, menu_config, cat_*, permissions) — porque ningún rol
 * nombrado tiene esos permisos de administración en rolePermissionSeed,
 * mismo comportamiento que el sistema anterior. Revisalos a mano desde
 * System > Menú si hace falta abrirlos a algún rol.
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { Role, MenuItem, RolePermission, RoleMenuItem } from '../models';

// Valor histórico de menu_items.required_permission en db_sport, por key, traducido a las keys
// reales del catálogo nuevo — null = sin restricción (visible para cualquier logueado).
const HISTORICAL_REQUIRED_PERMISSION: Record<string, string | null> = {
    dashboard: null,
    companys: null,
    bookings: 'booking.view',
    users: 'user.manage_all',
    permissions: 'system.full_access',
    menu_config: 'menu.manage',
    catalogs: 'system.full_access',
    suscripciones: null,
    cat_countries: 'country.manage',
    cat_sport_types: 'sport_type.manage',
    cat_sport_cats: 'sport_category.manage',
    cat_surface_types: 'surface_type.manage',
    cat_payment_types: 'payment_type.manage',
    cat_ubigeo: 'ubigeo.manage',
    cat_plans: 'plan.manage',
    reports: 'reports.view',
    statistics: 'statistics.view',
};

const seedFn = async (): Promise<void> => {
    const [roles, menuItems, rolePermissions] = await Promise.all([
        Role.findAll({ attributes: ['role_id', 'key', 'is_active'] }),
        MenuItem.findAll({ attributes: ['menu_id', 'key'] }),
        RolePermission.findAll({ attributes: ['role_id', 'permission_key'] }),
    ]);

    const systemRoleId = roles.find((r) => r.key === 'system')?.role_id;
    const activeRoleIds = roles.filter((r) => r.is_active).map((r) => r.role_id);

    const roleIdsByPermissionKey = new Map<string, number[]>();
    rolePermissions.forEach((rp) => {
        const list = roleIdsByPermissionKey.get(rp.permission_key) ?? [];
        list.push(rp.role_id);
        roleIdsByPermissionKey.set(rp.permission_key, list);
    });

    const rows: { role_id: number; menu_id: number }[] = [];

    menuItems.forEach((item) => {
        const requiredPermission = HISTORICAL_REQUIRED_PERMISSION[item.key] ?? null;
        const roleIds = new Set<number>(
            requiredPermission === null
                ? activeRoleIds
                : roleIdsByPermissionKey.get(requiredPermission) ?? []
        );
        if (systemRoleId) roleIds.add(systemRoleId);

        roleIds.forEach((role_id) => rows.push({ role_id, menu_id: item.menu_id }));
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
    order: 47, // mismo order que su baseline (047_baseline_role_menu_item) — depende de role/menu_item/role_permission
};

module.exports = config;
