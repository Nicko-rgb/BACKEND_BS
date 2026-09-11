/**
 * Seed: planes SaaS (Start/Pro/Business) — catálogo base de dsg_bss_saas_plans.
 * TRUNCATE + insert dentro de una transacción: reemplaza cualquier dato previo por
 * el set correcto de una sola vez. `runOnce` (seederRunner.ts) se encarga de que
 * esto solo corra una vez — para repetirlo a mano: DELETE FROM dsg_bss_seed_meta
 * WHERE seed_name = 'saasPlansSeed'.
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { SaaSPlan } from '../models';

const PLANS = [
    {
        name: 'Start',
        code: 'START',
        price_monthly: '59.00',
        price_yearly: '576.00',
        max_subsidiaries: 1,
        max_spaces: 1,
        max_users: 2,
        has_stripe_connect: true,
        max_invoices_monthly: 100,
        notifications_tier: 'basic',
        has_advanced_reports: false,
        allows_multi_company: false,
        features: [
            'Notificaciones básicas',
            'Reportes básicos',
            'Facturación electrónica limitada',
            'Soporte 24/7',
            'Instalación gratis',
        ],
        is_active: true,
    },
    {
        name: 'Pro',
        code: 'PRO',
        price_monthly: '89.00',
        price_yearly: '854.00',
        max_subsidiaries: 2,
        max_spaces: 3,
        max_users: 5,
        has_stripe_connect: true,
        max_invoices_monthly: 999,
        notifications_tier: 'full',
        has_advanced_reports: true,
        allows_multi_company: false,
        features: [
            'Notificaciones full',
            'Reportes avanzados',
            'Facturación electrónica ilimitada',
            'Soporte 24/7',
        ],
        is_active: true,
    },
    {
        name: 'Business',
        code: 'BUSINESS',
        price_monthly: '129.00',
        price_yearly: '1238.00',
        max_subsidiaries: 999,
        max_spaces: 999,
        max_users: 999,
        has_stripe_connect: true,
        max_invoices_monthly: 999,
        notifications_tier: 'full',
        has_advanced_reports: true,
        allows_multi_company: true,
        features: [
            'Multi empresa',
            'Sucursales ilimitadas',
            'Canchas ilimitadas',
            'Usuarios ilimitados',
            'Notificaciones full',
            'Reportes avanzados',
            'Facturación electrónica ilimitada',
            'Soporte 24/7',
        ],
        is_active: true,
    },
];

const seedFn = async (): Promise<void> => {
    const t = await sequelize.transaction();
    try {
        // cascade: true porque dsg_bss_saas_subscriptions referencia esta tabla por FK — Postgres
        // bloquea el TRUNCATE aunque esa tabla esté vacía (como ahora). Si este seed se vuelve a
        // correr a mano más adelante (borrando su fila de dsg_bss_seed_meta) con suscripciones
        // reales ya cargadas, el cascade también las truncaría — no es un seed pensado para
        // reejecutarse una vez que haya suscripciones de verdad.
        await SaaSPlan.destroy({ truncate: true, cascade: true, restartIdentity: true, transaction: t });
        await SaaSPlan.bulkCreate(PLANS, { transaction: t });
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'saasPlansSeed',
    seedFn,
    environment: 'essential',
    order: 27, // mismo orden que su baseline de migración (027_baseline_saas_plans) — no depende de otro seed
};

module.exports = config;
