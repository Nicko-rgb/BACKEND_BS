import { idPublicId } from '../../../shared/utils/ids';
import bcrypt from 'bcryptjs';
import sequelize from '../../../config/db';
import logger from '../../../config/logger';
import * as CompanyRepository from '../repository/company.repository';
import * as SaaSSubscriptionRepository from '../../saas/repository/saasSubscription.repository';
import { resolveRegistrationCoverage } from './companyRegistrationScope.service';
import { notify } from '../../notificacions/service/notification.service';
import { NotificationEvents } from '../../notificacions/constants/notificationEvents';
import * as UserRepository from '../../users/repository/user.repository';
import * as UserCompanyRepository from '../../users/repository/userCompany.repository';
import * as UserPermissionRepository from '../../users/repository/userPermission.repository';
import * as CountryRepository from '../../system/repository/country.repository';
import * as RoleRepository from '../../system/repository/role.repository';
import { hasFullCompanyAccess, assertCompanyScope } from '../../../shared/utils/accessScope';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { RegisterCompanyInput, UpdateCompanyInput, ListCompaniesQuery } from '../interfaces/company.interface';

/**
 * Empresas principales, paginado, con su dueño (resuelto por include en el repository) y su
 * plan (resuelto acá aparte, vía saasSubscription.repository — `companys` no puede importar
 * modelos de `saas` sin crear una dependencia circular, ver nota en Company.ts).
 *
 * `company.view` habilita la acción de listar. `system` ve el catálogo global;
 * los demás ven las empresas en `user.company_ids`, resueltas según propiedad
 * o empresa padre de sus asignaciones en cada request. El JWT no contiene el árbol.
 */
export const list = async (query: ListCompaniesQuery, user: AuthenticatedUser) => {
    const search = query.search?.trim() || undefined;
    const companyIds = hasFullCompanyAccess(user) ? undefined : (user.company_ids ?? []);

    const { rows, count } = await CompanyRepository.findAllPrincipal(query, search, companyIds, query.countryId, query.isEnabled);
    const plans = await SaaSSubscriptionRepository.findPlansByCompanyIds(rows.map((row) => row.company_id));

    return { rows, count, plans };
};

/**
 * Detalle de una empresa por `public_id` (lo único expuesto en URLs — nunca `company_id`
 * ni `tenant_id`). Mismo criterio de alcance que `list`: `system` entra a cualquiera,
 * otro rol solo si la empresa está en su `company_ids` (ver accessScope.ts) — el chequeo
 * se hace acá a mano porque el param de la URL es el `public_id`, no el `company_id`.
 */
export const getByPublicId = async (publicId: string, user: AuthenticatedUser) => {
    const company = await CompanyRepository.findByPublicId(publicId);
    if (!company) throw new NotFoundError('Empresa no encontrada');

    assertCompanyScope(user, Number(company.company_id), 'No tenés acceso a esta empresa');

    return company;
};

/**
 * Actualiza los datos de la propia empresa — mismo lookup y chequeo de alcance que
 * `getByPublicId` (ver accessScope.ts). Si viene `country_id`, revalida
 * que el país exista y esté activo, mismo criterio que `register`. Si viene `document`,
 * revalida que no choque con el de otra empresa (mismo `findByDocument` que usa `register`,
 * acá excluyendo a la propia empresa del chequeo).
 */
export const updateByPublicId = async (publicId: string, data: UpdateCompanyInput, user: AuthenticatedUser) => {
    const company = await CompanyRepository.findByPublicId(publicId);
    if (!company) throw new NotFoundError('Empresa no encontrada');

    assertCompanyScope(user, Number(company.company_id), 'No tenés acceso a esta empresa');

    if (data.country_id !== undefined) {
        const country = await CountryRepository.findById(data.country_id);
        if (!country) throw new BadRequestError('El país seleccionado no existe.');
        if (!country.is_active) throw new BadRequestError('El país seleccionado no está disponible actualmente.');
    }

    if (data.document !== undefined) {
        const existing = await CompanyRepository.findByDocument(data.document);
        if (existing && Number(existing.company_id) !== Number(company.company_id)) {
            throw new ConflictError('Ya existe una empresa registrada con este número de documento.');
        }
    }

    await CompanyRepository.update(company, { ...data, user_update: user.user_id });

    const updated = await CompanyRepository.findByPublicId(publicId);
    return updated!;
};

/**
 * Alta de primaria: Company + User (dueño) + Person + UserCompany + suscripción.
 * Alta de hermana: Company + vínculo a la suscripción y dueño existentes.
 * Solo system crea tenant y SaaSSubscription nuevos. Los usuarios acotados crean una
 * hermana en su grupo, con el mismo tenant y suscripción, si permite multiempresa.
 * Todo sucede en una transacción: empresa y dueño habilitados. La suscripción nueva
 * de una primaria usa `status: 'ACTIVE'`, `gateway: 'MANUAL'` — sin
 * comunicarse con MercadoPago. La integración de cobro (link de pago + trial + webhook,
 * ver saas/service/saasCheckout.service.ts y saasWebhook.service.ts, ya construida y
 * probada en sandbox) queda deshabilitada hasta que la app esté en un servidor real con
 * credenciales de producción — ver docs/pendiente-integracion-pagos-mercadopago.md.
 *
 * `user_create`/`created_by` de todo lo creado apunta al usuario que ejecuta el alta, nunca
 * al dueño nuevo — quien registra la empresa acá no es el dueño.
 */
export const register = async (payload: RegisterCompanyInput, user: AuthenticatedUser) => {
    const { company, owner, plan: planInput } = payload;

    if (await CompanyRepository.findByDocument(company.document)) {
        throw new ConflictError('Ya existe una empresa registrada con este número de documento.');
    }

    if (hasFullCompanyAccess(user) && !owner) throw new BadRequestError('La empresa primaria requiere un dueño.');
    if (!hasFullCompanyAccess(user) && owner) throw new BadRequestError('La empresa hermana hereda al dueño del grupo.');
    const ownerEmail = owner?.email.trim();
    if (ownerEmail && await UserRepository.findByEmail(ownerEmail)) {
        throw new ConflictError('Ya existe un usuario registrado con este correo electrónico.');
    }

    const country = await CountryRepository.findById(company.country_id);
    if (!country) throw new BadRequestError('El país seleccionado no existe.');
    if (!country.is_active) throw new BadRequestError('El país seleccionado no está disponible actualmente.');

    const superAdminRole = owner ? await RoleRepository.findByKey('super_admin') : null;
    if (owner && (!superAdminRole || !superAdminRole.is_active)) throw new BadRequestError('El rol no está configurado o activo en el sistema.');

    const publicId = idPublicId();
    const ownerPublicId = idPublicId();
    const hashedPassword = owner ? await bcrypt.hash(owner.password, 10) : null;

    const { newCompany, newUser, coverage } = await sequelize.transaction(async (transaction) => {
        const coverage = await resolveRegistrationCoverage(payload, user, transaction);
        const { tenantId } = coverage;
        const inheritedOwner = coverage.subscriptionId !== null
            ? await UserCompanyRepository.findOwnerByTenantId(tenantId, transaction) : null;
        if (coverage.subscriptionId !== null && !inheritedOwner?.user) throw new ConflictError('El grupo no tiene un dueño asignado.');
        const newUser = owner ? await UserRepository.create({
            first_name: owner.first_name,
            last_name: owner.last_name,
            email: ownerEmail!,
            password: hashedPassword,
            social_id: null,
            social_provider: null,
            role_id: superAdminRole!.role_id,
            public_id: ownerPublicId,
            is_enabled: true,
            user_create: user.user_id,
        }, transaction) : inheritedOwner!.user!;

        if (owner) {
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

            // Set inicial del dueño = plantilla del rol super_admin (después se edita por usuario).
            await UserPermissionRepository.grantRoleDefaults(
                Number(newUser.user_id),
                Number(superAdminRole!.role_id),
                user.user_id,
                transaction
            );
        }

        const newCompany = await CompanyRepository.create({
            name: company.name,
            address: company.address,
            document: company.document,
            phone_cell: company.phone_cell,
            phone: company.phone || null,
            website: null,
            country_id: company.country_id,
            ubigeo_id: company.ubigeo_id,
            tenant_id: tenantId,
            public_id: publicId,
            parent_company_id: null,
            status: null,
            postal_code: null,
            latitude: null,
            longitude: null,
            description: null,
            is_enabled: 'A',
            user_create: user.user_id,
            user_update: null,
        }, transaction);

        if (coverage.subscriptionId === null) await UserCompanyRepository.create({
            user_id: newUser.user_id,
            company_id: newCompany.company_id,
            is_owner: true,
            tenant_id: tenantId,
            is_active: true,
            created_by: user.user_id,
        }, transaction);

        const subscriptionId = coverage.subscriptionId ?? (await SaaSSubscriptionRepository.create({
            plan_id: coverage.planId,
            public_id: idPublicId(),
            status: 'ACTIVE',
            is_effective: true,
            billing_period: planInput!.billing_period,
            gateway: 'MANUAL',
            mp_payment_id: null,
            mp_payer_email: null,
            current_period_start: null,
            current_period_end: null,
            cancel_at_period_end: false,
            lead_uuid: null,
        }, transaction)).subscription_id;

        await SaaSSubscriptionRepository.linkToCompany(subscriptionId, newCompany.company_id, coverage.subscriptionId === null, transaction);

        return { newCompany, newUser, coverage };
    });

    // Recarga con el include de dueño (findByIdWithOwner) para poder armar el mismo DTO que
    // usa el listado — la instancia devuelta por Company.create() no trae las asociaciones.
    const companyWithOwner = await CompanyRepository.findByIdWithOwner(newCompany.company_id);
    const plans = await SaaSSubscriptionRepository.findPlansByCompanyIds([newCompany.company_id]);

    // Fuera de la transacción — un fallo del email no debe revertir el alta, ya está activa.
    try {
        await notify(NotificationEvents.COMPANY_REGISTERED, '[Company]', {
            ownerId: newUser.user_id,
            ownerEmail: newUser.email ?? '',
            ownerName: `${newUser.first_name} ${newUser.last_name}`,
            companyId: newCompany.company_id,
            companyName: company.name,
            planName: coverage.planName,
            tenantId: coverage.tenantId,
            createdBy: user.user_id,
        });
    } catch (err) {
        logger.error(`[CompanyService.register] No se pudo enviar el email de bienvenida para la empresa ${newCompany.company_id}`, { error: err });
    }

    return { company: companyWithOwner!, plan: plans[newCompany.company_id] ?? null };
};
