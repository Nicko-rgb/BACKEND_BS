/**
 * Seed: plantilla de permisos iniciales de cada rol (dsg_bss_role_permission).
 * Corre después de roleSeed (order 11) y permissionCatalogSeed (order 10) —
 * ambos deben existir antes por el FK de esta tabla. TRUNCATE + insert dentro
 * de una transacción, mismo patrón que el resto de los seeds essential.
 *
 * Es PLANTILLA para usuarios nuevos (se copia al crearlos) — editarla después
 * desde System > Roles NO toca usuarios existentes, esos se editan uno por uno.
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

        // Perfil propio — todo usuario autenticado puede ver/editar sus datos.
        'user.profile_edit',
    ],
    empleado: [
        // Empresa (solo lectura de las propias, el scope filtra por company_ids)
        'company.view',

        // Sucursal
        'sucursal.view',

        // Espacio
        'space.view',
        'space.edit',

        // Usuarios dentro de su empresa
        'user.client_manage',

        // Reservas
        'booking.create',
        'booking.view',
        'booking.confirm',
        'booking.cancel',

        // Pagos
        'payment.create',
        'payment.view',
        'payment.confirmed',
        'payment.refused',

        // Otros
        'reports.view',
        'statistics.view',

        // Perfil propio — todo usuario autenticado puede ver/editar sus datos.
        'user.profile_edit',
    ],
    administrador: [
        // Empresa
        'company.create',
        'company.view',
        'company.edit',

        // Sucursal
        'sucursal.create',
        'sucursal.edit',
        'sucursal.view',
        'sucursal.config',
        'sucursal.rating_manage',

        // Espacio
        'space.create',
        'space.view',
        'space.edit',
        'space.business_hour_manage',
        'space.media_manage',

        // Usuarios dentro de su empresa
        'user.employee_manage',
        'user.administrator_manage',
        'user.client_manage',

        // Reservas
        'booking.create',
        'booking.view',
        'booking.confirm',
        'booking.cancel',

        // Pagos
        'payment.create',
        'payment.view',
        'payment.confirmed',
        'payment.refused',

        // Otros
        'reports.view',
        'statistics.view',

        // Perfil propio — todo usuario autenticado puede ver/editar sus datos.
        'user.profile_edit',
    ],
    super_admin: [
        // Empresa
        'company.create',
        'company.view',
        'company.edit',

        // Sucursal
        'sucursal.create',
        'sucursal.edit',
        'sucursal.view',
        'sucursal.config',
        'sucursal.rating_manage',

        // Espacio
        'space.create',
        'space.view',
        'space.edit',
        'space.business_hour_manage',
        'space.media_manage',

        // Usuarios dentro de su empresa
        'user.employee_manage',
        'user.administrator_manage',
        'user.client_manage',
        'user.permission_manage',

        // Reservas
        'booking.create',
        'booking.view',
        'booking.confirm',
        'booking.cancel',

        // Pagos
        'payment.create',
        'payment.view',
        'payment.confirmed',
        'payment.refused',
        'payment.account_manage',

        // Otros
        'reports.view',
        'statistics.view',

        // Perfil propio — todo usuario autenticado puede ver/editar sus datos.
        'user.profile_edit',
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
