/**
 * Permisos asignables por usuarios NO-system — MAPEO MANUAL.
 *
 * El dueño de empresa (super_admin / administrador) reparte permisos a sus
 * empleados SOLO desde esta lista. Lo usa el picker de permisos
 * (userPermission.service) tanto para filtrar el catálogo como para validar
 * el PUT — un no-system nunca puede otorgar un permiso fuera de esta lista,
 * aunque lo mande a mano en el request.
 *
 * Para repartir un permiso nuevo hay que agregarlo acá a mano. Quedan fuera a
 * propósito: todo lo de `system.*`, `plan.manage` (SaaS) y `user.manage_all`
 * (solo system).
 */

export const SYSTEM_FULL_ACCESS = 'system.full_access';

export const ASSIGNABLE_PERMISSION_KEYS = [
    // ── Reservas ──
    'booking.create',
    'booking.view',
    'booking.confirm',
    'booking.cancel',

    // ── Pagos ──
    'payment.create',
    'payment.view',
    'payment.confirmed',
    'payment.refused',
    'payment.account_manage',

    // ── Empresa ──
    'company.view',
    'company.create',
    'company.edit',

    // ── Sucursal ──
    'sucursal.view',
    'sucursal.create',
    'sucursal.edit',
    'sucursal.config',
    'sucursal.rating_manage',

    // ── Espacios deportivos ──
    'space.view',
    'space.create',
    'space.edit',
    'space.business_hour_manage',
    'space.media_manage',

    // ── Usuarios ──
    'user.client_manage',
    'user.employee_manage',
    'user.administrator_manage',
    'user.profile_edit',

    // ── Reportes ──
    'reports.view',
    'statistics.view',
] as const;

// ¿Puede un usuario no-system otorgar esta key a otro usuario?
export const isAssignablePermission = (key: string): boolean =>
    (ASSIGNABLE_PERMISSION_KEYS as readonly string[]).includes(key);
