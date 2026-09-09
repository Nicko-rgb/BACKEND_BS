/**
 * permissionsConstants.ts
 * Permisos por defecto por tipo de rol.
 *
 * Se usa en runtime (UserRepository, UserManagementService) para asignar
 * permisos iniciales al crear un usuario.
 */

/**
 * Permisos por defecto que se insertan en user_permissions al crear un usuario.
 * Usado por UserRepository.createUserWithPermissions() y assignUserToCompany()
 * (se portan en el pase de rutas/servicios de `users`).
 *
 * Fuente de verdad para los permisos iniciales de cada tipo de usuario.
 */
export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
    cliente: [
        'booking.create',           // CREA RESERVA
        'booking.view_own',
        'booking.cancel_own',
        'payment.create',
        'rating.create',
        'profile.edit_own',
    ],
    empleado: [
        'booking.create',
        'booking.view_facility',
        'booking.confirm',
        'booking.cancel',
        'space.view',
        'payment.reorder',
    ],
    administrador: [
        'facility.manage_own',
        'space.manage_own',
        'space.view',
        'business_hour.manage',
        'media.manage_facility',
        'rating.view_facility',
        'booking.view_facility',
        'booking.confirm',
        'booking.cancel',
        'payment.reorder',
        'employee.manage_own',
        'reports.view',
        'statistics.view',
    ],
    super_admin: [
        'company.view',
        'subsidiary.manage_own',
        'facility.manage_own',
        'space.manage_own',
        'space.view',
        'business_hour.manage',
        'media.manage_facility',
        'rating.view_facility',
        'booking.view_facility',
        'booking.confirm',
        'booking.cancel',
        'payment.reorder',
        'payment_account.manage',
        'administrator.manage_own',
        'employee.manage_own',
        'config.user_assign',
        'reports.view',
        'statistics.view',
    ],
    system: [
        // El middleware ya hace bypass para system.full_access.
        // Se asignan todos los permisos del catálogo en systemUserSeed.
        'system.full_access',
    ],
};
