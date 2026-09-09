/**
 * Seed: permisos base de cada rol (dsg_bss_role_permission).
 * Corre después de roleSeed (order 11) y permissionCatalogSeed (order 10) —
 * ambos deben existir antes por el FK de esta tabla. TRUNCATE + insert dentro
 * de una transacción, mismo patrón que el resto de los seeds essential.
 *
 * Editable después desde System > Roles sin tocar código — esto es solo el
 * punto de partida de un sistema nuevo.
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { Permission, Role, RolePermission } from '../models';

const ROLE_PERMISSIONS: Record<string, string[]> = {
    cliente: [
        'booking.create',
        'booking.view',
        'booking.cancel',
        'payment.create',
        'sucursal.rating_create',
        'user.profile_edit',
    ],
    empleado: [
        'booking.create',
        'booking.view',
        'booking.confirm',
        'booking.cancel',
        'payment.create',
        'payment.view',
        'payment.confirmed',
        'payment.refused',
        'space.view',
    ],
    administrador: [
        'sucursal.view',
        'sucursal.edit',
        'sucursal.config',
        'space.manage',
        'space.view',
        'space.business_hour_manage',
        'space.media_manage',
        'sucursal.rating_manage',
        'booking.view',
        'booking.confirm',
        'booking.cancel',
        'payment.reorder',
        'user.employee_manage',
        'reports.view',
        'statistics.view',
    ],
    super_admin: [
        'company.manage',
        'company.view',
        'company.manage_own',
        'sucursal.manage',
        'space.manage',
        'sucursal.rating_manage',
        'booking.manage',
        'payment.account_manage',
        'user.employee_manage',
        'user.administrator_manage',
        'reports.view',
        'statistics.view',
    ],
    system: [
        // El middleware ya bypasea con este solo permiso — ver verificarPermiso.ts.
        'system.full_access',
    ],
};

const seedFn = async (): Promise<void> => {
    const roles = await Role.findAll({ attributes: ['role_id', 'key'] });
    const roleIdByKey = new Map(roles.map((r) => [r.key, r.role_id]));

    // Valida las keys de ROLE_PERMISSIONS contra el catálogo ya sembrado (permissionCatalogSeed,
    // order 10, corre antes) — si alguien renombra/borra una key en 001_permission_catalog.ts sin
    // actualizar acá, esto corta con un mensaje claro en vez de reventar como violación de FK al
    // hacer el bulkCreate (que además tumba TODO db:reset, no solo este seed).
    const catalogKeys = new Set((await Permission.findAll({ attributes: ['key'] })).map((p) => p.key));
    const allReferencedKeys = new Set(Object.values(ROLE_PERMISSIONS).flat());
    const missingKeys = [...allReferencedKeys].filter((key) => !catalogKeys.has(key));
    if (missingKeys.length > 0) {
        throw new Error(
            `rolePermissionSeed referencia keys que no existen en el catálogo de permisos: ${missingKeys.join(', ')}. ` +
            `¿Se renombraron en 001_permission_catalog.ts sin actualizar ROLE_PERMISSIONS acá?`
        );
    }

    const rows = Object.entries(ROLE_PERMISSIONS).flatMap(([roleKey, keys]) => {
        const roleId = roleIdByKey.get(roleKey);
        if (!roleId) return [];
        return keys.map((permission_key) => ({ role_id: roleId, permission_key }));
    });

    const t = await sequelize.transaction();
    try {
        await RolePermission.destroy({ truncate: true, cascade: true, restartIdentity: true, transaction: t });
        if (rows.length > 0) {
            await RolePermission.bulkCreate(rows, { transaction: t });
        }
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'rolePermissionSeed',
    seedFn,
    environment: 'essential',
    order: 46, // mismo order que su baseline (046_baseline_role_permission) — depende de role/permission
};

module.exports = config;
