/**
 * Seed: ítems de menú (dsg_bss_menu_items).
 * TRUNCATE + insert dentro de una transacción — mismo patrón que el resto de
 * los seeds essential. Datos traídos tal cual existían en la base anterior
 * (db_sport) — mismos key/label/icon/path/parent_key/app_access/group_title/
 * sort_order/is_active. Sin `required_permission`: esa columna ya no existe,
 * quién ve cada ítem se siembra aparte en 005_role_menu_item.ts.
 *
 * Única corrección respecto a los datos de origen: `cat_plans.path` apuntaba
 * a `/system/plans`, que no es una ruta real del front (la ruta real es
 * `/system/catalogs/plans`, ver ADMIN_BS/src/modules/system/index.routes.tsx)
 * — se corrigió acá. El resto se preserva tal cual, incluso ítems que hoy
 * todavía no tienen página en el front (reports, statistics, suscripciones,
 * bookings) — quedan visibles como en el sistema anterior, listos para
 * cuando esos módulos se porten.
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { MenuItem } from '../models';

type AppAccess = 'admin' | 'booking' | 'both';

interface MenuItemSeed {
    key: string;
    label: string;
    icon: string | null;
    path: string | null;
    parent_key: string | null;
    app_access: AppAccess;
    group_title: string | null;
    sort_order: number;
    is_active: boolean;
}

const MENU_ITEMS: MenuItemSeed[] = [
    { key: 'dashboard', label: 'Inicio', icon: 'Home', path: '/home', parent_key: null, app_access: 'admin', group_title: 'GENERAL', sort_order: 1, is_active: true },
    { key: 'companys', label: 'Compañias', icon: 'Building2', path: '/companys', parent_key: null, app_access: 'admin', group_title: 'GENERAL', sort_order: 2, is_active: true },
    { key: 'bookings', label: 'Reservas', icon: 'TbCalendarCheck', path: '/bookings', parent_key: null, app_access: 'admin', group_title: 'GENERAL', sort_order: 3, is_active: true },
    { key: 'users', label: 'Usuarios', icon: 'Users2', path: '/users', parent_key: null, app_access: 'admin', group_title: 'GENERAL', sort_order: 4, is_active: true },

    { key: 'permissions', label: 'Roles y Permisos', icon: 'ShieldCheck', path: '/system/permissions', parent_key: null, app_access: 'admin', group_title: 'SISTEMA', sort_order: 1, is_active: true },
    { key: 'menu_config', label: 'Configurar Menú', icon: 'Menu', path: '/system/menu', parent_key: null, app_access: 'admin', group_title: 'SISTEMA', sort_order: 2, is_active: true },
    { key: 'catalogs', label: 'Catálogos', icon: 'Layers', path: null, parent_key: null, app_access: 'admin', group_title: 'SISTEMA', sort_order: 3, is_active: true },
    { key: 'suscripciones', label: 'Suscripciones', icon: 'CreditCard', path: '/system/suscripciones', parent_key: null, app_access: 'admin', group_title: 'SISTEMA', sort_order: 4, is_active: true },

    { key: 'cat_countries', label: 'Países', icon: 'Globe', path: '/system/catalogs/countries', parent_key: 'catalogs', app_access: 'admin', group_title: 'SISTEMA', sort_order: 1, is_active: true },
    { key: 'cat_sport_types', label: 'Deportes', icon: 'Trophy', path: '/system/catalogs/sport-types', parent_key: 'catalogs', app_access: 'admin', group_title: 'SISTEMA', sort_order: 2, is_active: true },
    { key: 'cat_sport_cats', label: 'Categorías', icon: 'Tags', path: '/system/catalogs/sport-categories', parent_key: 'catalogs', app_access: 'admin', group_title: 'SISTEMA', sort_order: 3, is_active: true },
    { key: 'cat_surface_types', label: 'Superficies', icon: 'Grid3x3', path: '/system/catalogs/surface-types', parent_key: 'catalogs', app_access: 'admin', group_title: 'SISTEMA', sort_order: 4, is_active: true },
    { key: 'cat_payment_types', label: 'Tipos de pago', icon: 'CreditCard', path: '/system/catalogs/payment-types', parent_key: 'catalogs', app_access: 'admin', group_title: 'SISTEMA', sort_order: 5, is_active: true },
    { key: 'cat_ubigeo', label: 'Ubigeo', icon: 'MapPin', path: '/system/catalogs/ubigeo', parent_key: 'catalogs', app_access: 'admin', group_title: 'SISTEMA', sort_order: 6, is_active: true },
    { key: 'cat_plans', label: 'Planes', icon: 'Gift', path: '/system/catalogs/plans', parent_key: 'catalogs', app_access: 'admin', group_title: 'SISTEMA', sort_order: 7, is_active: true },

    { key: 'reports', label: 'Reportes', icon: 'FileText', path: '/reports', parent_key: null, app_access: 'admin', group_title: 'SUPPORT', sort_order: 1, is_active: true },
    { key: 'statistics', label: 'Estadísticas', icon: 'BarChart2', path: '/statistics', parent_key: null, app_access: 'admin', group_title: 'SUPPORT', sort_order: 2, is_active: true },
];

const seedFn = async (): Promise<void> => {
    const t = await sequelize.transaction();
    try {
        // cascade: true porque dsg_bss_role_menu_item referencia esta tabla por FK.
        await MenuItem.destroy({ truncate: true, cascade: true, restartIdentity: true, transaction: t });
        await MenuItem.bulkCreate(MENU_ITEMS, { transaction: t });
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'menuItemSeed',
    seedFn,
    environment: 'essential',
    order: 11, // mismo order que su baseline (011_baseline_menu_item) — sin depender de otro seed
};

module.exports = config;
