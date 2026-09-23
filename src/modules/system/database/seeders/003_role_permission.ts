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

// Permiso que tiene TODO rol, sin excepción — cualquier usuario autenticado puede cargar y
// editar sus propios datos (GET/PUT /api/users/me), sin importar su rol ni sus demás permisos.
// Se agrega una sola vez para todos al construir `rows`, en vez de repetirlo a mano en cada
// lista de abajo (ver seedFn).
const UNIVERSAL_PERMISSIONS = ['user.profile_edit'];

const ROLE_PERMISSIONS: Record<string, string[]> = {
    cliente: [
        'booking.create',
        'booking.view',
        'booking.cancel',
        'payment.create',
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
        'user.client_manage',
    ],
    administrador: [
        'sucursal.create',
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
        'user.client_manage',
        'reports.view',
        'statistics.view',
    ],
    super_admin: [
        'sucursal.create',
        'company.manage',
        'company.view',
        'company.manage_own',
        'space.manage',
        'sucursal.rating_manage',
        'booking.manage',
        'payment.account_manage',
        'user.employee_manage',
        'user.administrator_manage',
        'user.client_manage',
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
    const allReferencedKeys = new Set([...Object.values(ROLE_PERMISSIONS).flat(), ...UNIVERSAL_PERMISSIONS]);
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
        return [...keys, ...UNIVERSAL_PERMISSIONS].map((permission_key) => ({ role_id: roleId, permission_key }));
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
