/**
 * Seed: catálogo de permisos (dsg_bss_permissions).
 * TRUNCATE + insert dentro de una transacción — mismo patrón que
 * saas/001_saas_plans.ts. Cubre TODAS las keys usadas hoy en `verificarPermiso(...)`
 * en las rutas (para que esos endpoints sean protegibles) más las que asigna
 * 003_role_permission.ts a cada rol — el FK de role_permission.permission_key exige
 * que existan acá antes de sembrar esa tabla (por eso el `order` de este seed es
 * menor).
 *
 * `module` = a qué módulo real del código pertenece (carpeta bajo src/modules/) —
 * se declara explícito por permiso, NO se puede derivar de la key: por ejemplo
 * `payment.create`/`payment.view` son de `bookings` (pagos de una reserva) pero
 * `payment.account_manage` es de `companys` (cuentas/credenciales de pago de la
 * empresa), mismo prefijo de key, módulo real distinto.
 * `group_name` = agrupación funcional dentro del módulo — ese sí es mecánico,
 * el prefijo de la key (booking, payment, sucursal, etc.), igual que antes
 * vivía (mal nombrado) en la columna `module`.
 * Ambos alimentan los filtros de PermissionsPage.tsx (por módulo y por grupo).
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { Permission } from '../models';
import type { PermissionModule } from '../models/Permission';

type AppAccess = 'admin' | 'booking' | 'both';

interface PermissionSeed {
    key: string;
    label: string;
    description: string;
    module: PermissionModule;
    app_access: AppAccess;
}

const groupOf = (key: string): string => key.split('.')[0];

const PERMISSIONS: PermissionSeed[] = [
    // ── booking — reservas (portal cliente + panel admin) ──────────────────
    { key: 'booking.create', label: 'Crear reserva', description: 'Crear una nueva reserva', module: 'bookings', app_access: 'both' },
    { key: 'booking.view', label: 'Ver reservas', description: 'Ver el listado y detalle de reservas', module: 'bookings', app_access: 'both' },
    { key: 'booking.confirm', label: 'Confirmar reserva', description: 'Confirmar una reserva pendiente', module: 'bookings', app_access: 'admin' },
    { key: 'booking.cancel', label: 'Cancelar reserva', description: 'Cancelar una reserva propia o de la sucursal', module: 'bookings', app_access: 'both' },
    { key: 'booking.manage', label: 'Gestionar reservas', description: 'Gestión completa de reservas de la empresa', module: 'bookings', app_access: 'admin' },

    // ── payment — pagos de reserva (bookings) salvo cuentas/credenciales (companys) ──
    { key: 'payment.create', label: 'Crear pago', description: 'Crear un pago de reserva', module: 'bookings', app_access: 'both' },
    { key: 'payment.view', label: 'Ver pagos', description: 'Ver el listado y detalle de pagos', module: 'bookings', app_access: 'admin' },
    { key: 'payment.confirmed', label: 'Confirmar pago', description: 'Confirmar un pago de reserva', module: 'bookings', app_access: 'admin' },
    { key: 'payment.refused', label: 'Rechazar pago', description: 'Rechazar un pago de reserva', module: 'bookings', app_access: 'admin' },
    { key: 'payment.reorder', label: 'Reordenar pagos', description: 'Reordenar el listado de pagos', module: 'bookings', app_access: 'admin' },
    { key: 'payment.account_manage', label: 'Gestionar cuentas de pago', description: 'Gestionar las cuentas/credenciales de pago de la empresa', module: 'companys', app_access: 'admin' },
    
    // ── space — canchas/espacios deportivos (companys) ──────────────────────
    { key: 'space.view', label: 'Ver espacios', description: 'Ver el listado y detalle de espacios', module: 'companys', app_access: 'admin' },
    { key: 'space.manage', label: 'Gestionar espacios', description: 'Alta, edición y baja de espacios', module: 'companys', app_access: 'admin' },
    { key: 'space.business_hour_manage', label: 'Gestionar horarios', description: 'Gestionar los horarios de trabajo de un espacio', module: 'companys', app_access: 'admin' },
    { key: 'space.media_manage', label: 'Gestionar imágenes de espacio', description: 'Subir/eliminar imágenes de un espacio', module: 'companys', app_access: 'admin' },
    
    // ── sucursal (companys) ───────────────────────────────────────────────────
    { key: 'sucursal.view', label: 'Ver sucursales', description: 'Ver el listado y detalle de sucursales', module: 'companys', app_access: 'admin' },
    { key: 'sucursal.edit', label: 'Editar sucursales', description: 'Editar los datos de una sucursal', module: 'companys', app_access: 'admin' },
    { key: 'sucursal.create', label: 'Registrar sucursal', description: 'Registrar una Sucursal', module: 'companys', app_access: 'admin'},
    { key: 'sucursal.config', label: 'Configurar sucursales', description: 'Configurar parámetros de una sucursal', module: 'companys', app_access: 'admin' },
    { key: 'sucursal.rating_manage', label: 'Gestionar calificaciones', description: 'Moderar calificaciones recibidas por una sucursal', module: 'companys', app_access: 'admin' },
    
    // ── user — usuarios del sistema (users) ─────────────────────────────────
    { key: 'user.employee_manage', label: 'Gestionar empleados', description: 'Alta, edición y baja de empleados', module: 'users', app_access: 'admin' },
    { key: 'user.administrator_manage', label: 'Gestionar administradores', description: 'Alta, edición y baja de administradores', module: 'users', app_access: 'admin' },
    { key: 'user.client_manage', label: 'Gestionar clientes', description: 'Alta y edición de clientes (ej. registrar un cliente para una reserva)', module: 'users', app_access: 'admin' },
    { key: 'user.manage_all', label: 'Gestionar todos los usuarios', description: 'Acceso completo al catálogo de usuarios del sistema, sin importar su rol', module: 'users', app_access: 'admin' },
    { key: 'user.profile_edit', label: 'Editar perfil', description: 'Editar los datos del propio perfil', module: 'users', app_access: 'booking' },

    // ── reports / statistics — sin módulo propio todavía, reportan sobre companys ──
    { key: 'reports.view', label: 'Ver reportes', description: 'Ver reportes de la empresa/sucursal', module: 'companys', app_access: 'admin' },
    { key: 'statistics.view', label: 'Ver estadísticas', description: 'Ver estadísticas de la empresa/sucursal', module: 'companys', app_access: 'admin' },

    // ── company — empresas (companys) ───────────────────────────────────────
    { key: 'company.manage', label: 'Gestionar empresas', description: 'Gestión completa de la propia empresa', module: 'companys', app_access: 'admin' },
    { key: 'company.view', label: 'Ver empresas', description: 'Ver el listado y detalle de empresas', module: 'companys', app_access: 'admin' },
    { key: 'company.manage_own', label: 'Gestionar empresa propia', description: 'Gestionar los datos de la propia empresa', module: 'companys', app_access: 'admin' },
    { key: 'company.create', label: 'Crear empresa', description: 'Registrar una empresa nueva en el sistema', module: 'companys', app_access: 'admin' },

    // ── system — administración del sistema (system) ────────────────────────
    { key: 'system.full_access', label: 'Acceso total al sistema', description: 'Bypasea cualquier chequeo de permiso — exclusivo del rol system', module: 'system', app_access: 'admin' },
    { key: 'menu.manage', label: 'Gestionar menú', description: 'Administrar el catálogo de ítems de menú y su asignación por rol', module: 'system', app_access: 'admin' },
    { key: 'country.manage', label: 'Gestionar países', description: 'Administrar el catálogo de países', module: 'system', app_access: 'admin' },
    { key: 'ubigeo.manage', label: 'Gestionar ubigeo', description: 'Administrar el árbol de ubigeo (departamento/provincia/distrito)', module: 'system', app_access: 'admin' },
    { key: 'sport_type.manage', label: 'Gestionar tipos de deporte', description: 'Administrar el catálogo de tipos de deporte', module: 'system', app_access: 'admin' },
    { key: 'sport_category.manage', label: 'Gestionar categorías deportivas', description: 'Administrar el catálogo de categorías deportivas', module: 'system', app_access: 'admin' },
    { key: 'surface_type.manage', label: 'Gestionar tipos de superficie', description: 'Administrar el catálogo de tipos de superficie', module: 'system', app_access: 'admin' },
    { key: 'payment_type.manage', label: 'Gestionar tipos de pago', description: 'Administrar el catálogo de tipos de pago', module: 'system', app_access: 'admin' },

    // ── plan — planes SaaS (saas), aunque se administre desde una ruta de system ──
    { key: 'plan.manage', label: 'Gestionar planes', description: 'Administrar los planes SaaS del sistema', module: 'saas', app_access: 'admin' },
];

const seedFn = async (): Promise<void> => {
    const t = await sequelize.transaction();
    try {
        // cascade: true porque role_permission/menu_item pueden referenciar esta tabla por FK.
        await Permission.destroy({ truncate: true, cascade: true, restartIdentity: true, transaction: t });
        await Permission.bulkCreate(
            PERMISSIONS.map((p) => ({ ...p, group_name: groupOf(p.key) })),
            { transaction: t }
        );
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'permissionCatalogSeed',
    seedFn,
    environment: 'essential',
    order: 10, // mismo order que su baseline (010_baseline_permissions) — sin depender de otro seed
};

module.exports = config;
