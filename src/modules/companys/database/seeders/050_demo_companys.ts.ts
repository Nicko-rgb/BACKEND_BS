/**
 * Seed demo: empresa + sucursal de ejemplo (solo desarrollo).
 *
 * Crea en una sola transacción, replicando company.service.ts::register y
 * sucursal.service.ts::register:
 *   - Empresa principal en Perú (country_id 6, ubigeo 2078 Callería/Coronel
 *     Portillo/Ucayali), con su propio tenant_id — is_enabled 'A'.
 *   - Dueño (rol super_admin) + Person con DNI peruano, asignado a la empresa.
 *   - Suscripción ACTIVE al plan Start, gateway MANUAL — igual que el alta sin MercadoPago.
 *   - Una sucursal (también en Callería) que hereda RUC y tenant_id del padre.
 *   - Un usuario rol administrador asignado a la sucursal.
 *
 * `environment: 'demo'` — seederRunner.ts solo ejecuta los demo cuando
 * NODE_ENV !== 'production', así que en producción se omite solo.
 * `dependsOnSystemUser: true` — recibe el user_id del system para user_create/created_by.
 * `order: 49` — después de ubigeo (48), planes SaaS (27), system user (12) y roles (11).
 *
 * Idempotente: si el email del dueño ya existe, no crea nada (además `runOnce`
 * registra seed_name en dsg_bss_seed_meta para no repetirlo).
 *
 * Credenciales demo (desarrollo):
 *   dueño:  dueno.demo@demo.pe  / Demo1234*
 *   admin:   admin.demo@demo.pe  / Demo1234*
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import * as CompanyRepository from '../../repository/company.repository';
import * as UserRepository from '../../../users/repository/user.repository';
import * as UserCompanyRepository from '../../../users/repository/userCompany.repository';
import * as SaaSSubscriptionRepository from '../../../saas/repository/saasSubscription.repository';
import { SaaSPlan } from '../../../saas/database/models';
import * as RoleRepository from '../../../system/repository/role.repository';
import * as CountryRepository from '../../../system/repository/country.repository';

const PERU_COUNTRY_ID = 6;
const CALLERIA_UBIGEO_ID = 2078; // Callería, Coronel Portillo, Ucayali (distrito/provincia/departamento)

const OWNER_EMAIL = 'mancillanixon7@gmail.com';
const ADMIN_EMAIL = 'claystm@gmail.com';
const DEMO_PASSWORD = '12345678';
const COMPANY_DOCUMENT = '20123456789';

const seedFn = async (systemUserId?: number): Promise<void> => {
    if (!systemUserId) {
        throw new Error('demoCompanySeed necesita systemUserId — seederRunner lo provee con dependsOnSystemUser.');
    }

    // Idempotencia — si ya se corrió (o alguien registró este email), no duplicar.
    if (await UserRepository.findByEmail(OWNER_EMAIL)) return;
    if (await CompanyRepository.findByDocument(COMPANY_DOCUMENT)) {
        throw new Error(`Ya existe una empresa con RUC ${COMPANY_DOCUMENT} — liberá ese documento antes de correr demoCompanySeed.`);
    }

    const country = await CountryRepository.findById(PERU_COUNTRY_ID);
    if (!country || !country.is_active) {
        throw new Error('Perú (country_id 6) no existe o no está activo — corré countrySeed antes que demoCompanySeed.');
    }

    const startPlan = await SaaSPlan.findOne({ where: { code: 'START', is_active: true } });
    if (!startPlan) {
        throw new Error('Plan START no encontrado — corré saasPlansSeed antes que demoCompanySeed.');
    }

    const superAdminRole = await RoleRepository.findByKey('super_admin');
    const adminRole = await RoleRepository.findByKey('administrador');
    if (!superAdminRole || !adminRole) {
        throw new Error('Roles super_admin/administrador no encontrados — corré roleSeed antes que demoCompanySeed.');
    }

    const tenantId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

    await sequelize.transaction(async (transaction) => {
        // Dueño ───────────────────────────────────────────────────────────────
        const owner = await UserRepository.create({
            first_name: 'Nixon',
            last_name: 'Mancilla',
            email: OWNER_EMAIL,
            password: hashedPassword,
            social_id: null,
            social_provider: null,
            role_id: superAdminRole.role_id,
            is_enabled: true,
            user_create: systemUserId,
        }, transaction);

        await UserRepository.createPerson({
            user_id: owner.user_id,
            country_id: PERU_COUNTRY_ID,
            date_birth: '2002-01-15',
            gender: null,
            document_type: 'IDENTITY_CARD',
            document_number: '71721109',
            phone: '925075598',
            ubigeo_id: CALLERIA_UBIGEO_ID,
            occupation: null,
            civil_state: null,
            sports_preferences: null,
            accept_marketing: false,
            preferences: null,
            default_payment_type_id: null,
        }, transaction);

        // Empresa ─────────────────────────────────────────────────────────────
        const company = await CompanyRepository.create({
            name: 'Empresa Nixon',
            address: 'Av. Miraflores 1230 Mz 20',
            document: COMPANY_DOCUMENT,
            phone_cell: '987654321',
            phone: '014221234',
            website: null,
            country_id: PERU_COUNTRY_ID,
            ubigeo_id: CALLERIA_UBIGEO_ID,
            tenant_id: tenantId,
            public_id: crypto.randomUUID(),
            parent_company_id: null,
            status: null,
            postal_code: null,
            latitude: null,
            longitude: null,
            description: null,
            is_enabled: 'A',
            user_create: systemUserId,
            user_update: null,
        }, transaction);

        await UserCompanyRepository.create({
            user_id: owner.user_id,
            company_id: company.company_id,
            role: 'super_admin',
            tenant_id: tenantId,
            is_active: true,
            created_by: systemUserId,
        }, transaction);

        // Suscripción Start ACTIVE (gateway MANUAL, como el alta sin MP) ───────
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() + 30);

        const subscription = await SaaSSubscriptionRepository.create({
            plan_id: startPlan.plan_id,
            public_id: crypto.randomUUID(),
            status: 'ACTIVE',
            billing_period: 'monthly',
            gateway: 'MANUAL',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            mp_payment_id: null,
            mp_payer_email: null,
            current_period_start: now,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            lead_uuid: null,
        }, transaction);

        await SaaSSubscriptionRepository.linkToCompany(subscription.subscription_id, company.company_id, transaction);

        // Sucursal (hereda RUC y tenant del padre) ────────────────────────────
        const sucursal = await CompanyRepository.create({
            name: 'Sucursal Nick',
            address: 'Av. Grau 400 Calleria',
            document: COMPANY_DOCUMENT,
            phone_cell: '987650001',
            phone: null,
            website: null,
            country_id: PERU_COUNTRY_ID,
            ubigeo_id: CALLERIA_UBIGEO_ID,
            tenant_id: tenantId,
            public_id: crypto.randomUUID(),
            parent_company_id: company.company_id,
            status: 'ACTIVE',
            postal_code: null,
            latitude: '-8.382500',
            longitude: '-74.549000',
            description: 'Sucursal de demostración',
            is_enabled: null,
            user_create: systemUserId,
            user_update: null,
        }, transaction);

        // Administrador de la sucursal ────────────────────────────────────────
        const admin = await UserRepository.create({
            first_name: 'Clay',
            last_name: 'STM',
            email: ADMIN_EMAIL,
            password: hashedPassword,
            social_id: null,
            social_provider: null,
            role_id: adminRole.role_id,
            is_enabled: true,
            user_create: systemUserId,
        }, transaction);

        await UserRepository.createPerson({
            user_id: admin.user_id,
            country_id: PERU_COUNTRY_ID,
            date_birth: '2004-06-20',
            gender: null,
            document_type: 'IDENTITY_CARD',
            document_number: '87654321',
            phone: '987650002',
            ubigeo_id: CALLERIA_UBIGEO_ID,
            occupation: null,
            civil_state: null,
            sports_preferences: null,
            accept_marketing: false,
            preferences: null,
            default_payment_type_id: null,
        }, transaction);

        await UserCompanyRepository.create({
            user_id: admin.user_id,
            company_id: sucursal.company_id,
            role: 'administrador',
            tenant_id: tenantId,
            is_active: true,
            created_by: systemUserId,
        }, transaction);
    });
};

const config: SeederConfig = {
    seedName: 'demoCompanySeed',
    seedFn,
    environment: 'demo', // seederRunner solo lo corre si NODE_ENV !== 'production'
    dependsOnSystemUser: true,
    order: 49, // después de ubigeo (48), planes SaaS (27), system user (12) y roles (11)
};

module.exports = config;
