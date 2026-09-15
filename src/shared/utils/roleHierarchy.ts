import type { AuthenticatedUser } from '../types/auth';

// Roles base gestionables desde la app, de mayor a menor privilegio.
export const MANAGED_ROLES = ['system', 'super_admin', 'administrador', 'empleado', 'cliente'] as const;

export type ManagedRole = (typeof MANAGED_ROLES)[number];

/**
 * Jerarquía de gestión de usuarios: qué rol puede crear/editar un usuario de qué otro rol, y qué
 * permiso exige gestionar cada rol. Independiente del `scope_level` (alcance de datos, ver
 * accessScope.ts) — `cliente` no tiene scope_level pero sí forma parte de esta jerarquía.
 *
 *   - system:        a sí mismo y a cualquier otro rol.
 *   - super_admin:   a sí mismo y a administrador/empleado/cliente.
 *   - administrador: a sí mismo y a empleado/cliente.
 *   - empleado:      a sí mismo y a cliente.
 *   - cliente:       solo a sí mismo.
 */
const MANAGEABLE_ROLES: Record<ManagedRole, readonly ManagedRole[]> = {
    system: ['system', 'super_admin', 'administrador', 'empleado', 'cliente'],
    super_admin: ['super_admin', 'administrador', 'empleado', 'cliente'],
    administrador: ['administrador', 'empleado', 'cliente'],
    empleado: ['empleado', 'cliente'],
    cliente: ['cliente'],
};

// Permiso que exige crear/editar un usuario de cada rol.
const ROLE_MANAGE_PERMISSIONS: Record<ManagedRole, string> = {
    system: 'system.full_access',
    super_admin: 'user.manage_all',
    administrador: 'user.administrator_manage',
    empleado: 'user.employee_manage',
    cliente: 'user.client_manage',
};

export const isManagedRole = (value: string): value is ManagedRole =>
    (MANAGED_ROLES as readonly string[]).includes(value);

// ¿Un usuario con rol `actingRole` puede crear/editar un usuario con rol `targetRole`?
export const canManageRole = (actingRole: string, targetRole: string): boolean =>
    isManagedRole(actingRole) && isManagedRole(targetRole) && MANAGEABLE_ROLES[actingRole].includes(targetRole);

// ¿`user` puede asignar `roleKey` (crear o editar un usuario con ese rol)? Exige la jerarquía y el
// permiso de ese rol — system.full_access cubre el permiso, no la jerarquía.
export const canAssignRole = (user: Pick<AuthenticatedUser, 'role' | 'permissions'>, roleKey: string): boolean => {
    if (!isManagedRole(roleKey) || !canManageRole(user.role, roleKey)) return false;
    return user.permissions.includes('system.full_access') || user.permissions.includes(ROLE_MANAGE_PERMISSIONS[roleKey]);
};
