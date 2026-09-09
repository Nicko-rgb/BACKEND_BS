import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { InferAttributes } from 'sequelize';
import sequelize from '../../../config/db';
import logger from '../../../config/logger';
import * as CompanyRepository from '../repository/company.repository';
import * as SaaSSubscriptionRepository from '../../saas/repository/saasSubscription.repository';
import * as SaaSPlanRepository from '../../saas/repository/saasPlan.repository';
import * as SaaSCheckoutService from '../../saas/service/saasCheckout.service';
import * as NotificationService from '../../notificacions/service/notification.service';
import { NotificationEvents } from '../../notificacions/constants/notificationEvents';
import * as UserRepository from '../../users/repository/user.repository';
import * as UserPermissionRepository from '../../users/repository/userPermission.repository';
import * as UserCompanyRepository from '../../users/repository/userCompany.repository';
import * as CountryRepository from '../../system/repository/country.repository';
import { DEFAULT_PERMISSIONS } from '../../system/constants/permissionsConstants';
import { hasFullCompanyAccess } from '../../../shared/utils/accessScope';
import { BadRequestError, ConflictError } from '../../../shared/errors/CustomErrors';
import type { PaginationQuery } from '../../../shared/types/pagination';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { Person } from '../../users/database/models';

export interface ListCompaniesQuery extends PaginationQuery {
    search?: string;
    countryId?: number;
    isEnabled?: string;
}

/**
 * Empresas principales, paginado, con su dueño (resuelto por include en el repository) y su
 * plan (resuelto acá aparte, vía saasSubscription.repository — `companys` no puede importar
 * modelos de `saas` sin crear una dependencia circular, ver nota en Company.ts).
 *
 * Alcance de datos por ROL, no por permiso (regla general del sistema, ver
 * shared/utils/accessScope.ts) — `company.view` (verificarPermiso, en la ruta) solo
 * habilita la acción de listar; hasta dónde ve cada uno lo decide acá el rol: `system`
 * ve el catálogo completo, cualquier otro rol (hoy solo `super_admin` tiene `company.view`)
 * queda acotado a `user.company_ids` — las empresas raíz que tiene asignadas por
 * UserCompany, ya expandido en el JWT del login.
 */
export const list = async (query: ListCompaniesQuery, user: AuthenticatedUser) => {
    const search = query.search?.trim() || undefined;
    const companyIds = hasFullCompanyAccess(user) ? undefined : (user.company_ids ?? []);

    const { rows, count } = await CompanyRepository.findAllPrincipal(query, search, companyIds, query.countryId, query.isEnabled);
    const plans = await SaaSSubscriptionRepository.findPlansByCompanyIds(rows.map((row) => row.company_id));

    return { rows, count, plans };
};

// Payload del wizard de alta — un objeto por paso del frontend (empresa, dueño, plan).
export interface RegisterCompanyInput {
    company: { name: string; document: string; country_id: number; ubigeo_id: number; address: string; phone_cell: string; phone?: string | null; website?: string | null; };
    owner: { first_name: string; last_name: string; email: string; password: string; phone: string; country_id: number; document_type: InferAttributes<Person>['document_type']; document_number: string; date_birth?: string | null; };
    plan: { plan_id: number; billing_period: 'monthly' | 'yearly'; };
}

/**
 * Alta de empresa — crea Company + User (dueño, rol super_admin) + Person + UserCompany +
 * permisos por defecto + SaaSSubscription en una sola transacción, todo en estado "pendiente
 * de pago": `company.is_enabled: 'P'`, `user.is_enabled: false`, `subscription.status:
 * 'PENDING'`.
 *
 * `user_create`/`created_by` de todo lo creado apunta al `system` que ejecuta el alta, nunca
 * al dueño nuevo — quien registra la empresa acá no es el dueño.
 */
export const register = async (payload: RegisterCompanyInput, user: AuthenticatedUser) => {
    const { company, owner, plan: planInput } = payload;

    const plan = await SaaSPlanRepository.findById(planInput.plan_id);
    if (!plan || !plan.is_active) {
        throw new BadRequestError('El plan seleccionado no existe o no está activo.');
    }

    if (await CompanyRepository.findByDocument(company.document)) {
        throw new ConflictError('Ya existe una empresa registrada con este número de documento.');
    }

    const ownerEmail = owner.email.trim();
    if (await UserRepository.findByEmail(ownerEmail)) {
        throw new ConflictError('Ya existe un usuario registrado con este correo electrónico.');
    }

    const country = await CountryRepository.findById(company.country_id);
    if (!country) throw new BadRequestError('El país seleccionado no existe.');
    if (!country.is_active) throw new BadRequestError('El país seleccionado no está disponible actualmente.');

    const tenantId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(owner.password, 10);

    const { newCompany, newUser, subscription } = await sequelize.transaction(async (transaction) => {
        const newUser = await UserRepository.create({
            first_name: owner.first_name,
            last_name: owner.last_name,
            email: ownerEmail,
            password: hashedPassword,
            social_id: null,
            social_provider: null,
            role: 'super_admin',
            is_enabled: false,
            user_create: user.user_id,
        }, transaction);

        await UserRepository.createPerson({
            user_id: newUser.user_id,
            country_id: owner.country_id,
            date_birth: owner.date_birth || null,
            gender: null,
            document_type: owner.document_type,
            document_number: owner.document_number,
            phone: owner.phone,
            ubigeo_id: null,
            occupation: null,
            civil_state: null,
            sports_preferences: null,
            accept_marketing: false,
            preferences: null,
            default_payment_type_id: null,
        }, transaction);

        await UserPermissionRepository.grantDefaults(newUser.user_id, DEFAULT_PERMISSIONS.super_admin ?? [], user.user_id, transaction);

        const newCompany = await CompanyRepository.create({
            name: company.name,
            address: company.address,
            document: company.document,
            phone_cell: company.phone_cell,
            phone: company.phone || null,
            website: company.website || null,
            country_id: company.country_id,
            ubigeo_id: company.ubigeo_id,
            tenant_id: tenantId,
            parent_company_id: null,
            status: null,
            postal_code: null,
            latitude: null,
            longitude: null,
            description: null,
            parking_available: false,
            opening_time: null,
            closing_time: null,
            min_price: null,
            features: null,
            is_enabled: 'P',
            user_create: user.user_id,
            user_update: null,
        }, transaction);

        await UserCompanyRepository.create({
            user_id: newUser.user_id,
            company_id: newCompany.company_id,
            role: 'super_admin',
            tenant_id: tenantId,
            is_active: true,
            created_by: user.user_id,
        }, transaction);

        const subscription = await SaaSSubscriptionRepository.create({
            plan_id: plan.plan_id,
            status: 'PENDING',
            billing_period: planInput.billing_period,
            gateway: 'MERCADOPAGO',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            mp_payment_id: null,
            mp_payer_email: null,
            current_period_start: null,
            current_period_end: null,
            cancel_at_period_end: false,
            lead_uuid: null,
        }, transaction);

        await SaaSSubscriptionRepository.linkToCompany(subscription.subscription_id, newCompany.company_id, transaction);

        return { newCompany, newUser, subscription };
    });

    // Recarga con el include de dueño (findByIdWithOwner) para poder armar el mismo DTO que
    // usa el listado — la instancia devuelta por Company.create() no trae las asociaciones.
    const companyWithOwner = await CompanyRepository.findByIdWithOwner(newCompany.company_id);
    const plans = await SaaSSubscriptionRepository.findPlansByCompanyIds([newCompany.company_id]);

    // Fuera de la transacción — es una llamada de red a MercadoPago, no debe sostener el lock
    // de la DB. Si falla, la empresa ya quedó creada (pendiente de pago); se loguea y el link
    // se puede regenerar después, no revierte el alta.
    let paymentUrl: string | null = null;
    try {
        paymentUrl = await SaaSCheckoutService.createPaymentLink(subscription, plan, planInput.billing_period, ownerEmail, country);
    } catch (err) {
        logger.error(`[CompanyService.register] No se pudo generar el link de pago para la empresa ${newCompany.company_id}`, { error: err });
    }

    // Sin link de pago no hay nada que mandarle al dueño todavía — si falló arriba, el email
    // queda pendiente para cuando alguien regenere el link a mano.
    if (paymentUrl) {
        try {
            await NotificationService.notify(NotificationEvents.COMPANY_PENDING_PAYMENT, {
                ownerId: newUser.user_id,
                ownerEmail,
                ownerName: `${owner.first_name} ${owner.last_name}`,
                companyId: newCompany.company_id,
                companyName: company.name,
                planName: plan.name,
                paymentUrl,
                tenantId: tenantId,
                createdBy: user.user_id,
            });
        } catch (err) {
            logger.error(`[CompanyService.register] No se pudo enviar el email de pago pendiente para la empresa ${newCompany.company_id}`, { error: err });
        }
    }

    return { company: companyWithOwner!, plan: plans[newCompany.company_id] ?? null, paymentUrl };
};
