import sequelize from '../../../config/db';
import { idPublicId } from '../../../shared/utils/ids';
import type { InferAttributes } from 'sequelize';
import * as CompanyRepository from '../repository/company.repository';
import * as CountryRepository from '../../system/repository/country.repository';
import * as PlanLimitsService from '../../saas/service/planLimits.service';
import { assertCompanyScope } from '../../../shared/utils/accessScope';
import { BadRequestError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { Company } from '../database/models';
import type { RegisterSucursalInput, UpdateSucursalInput, SucursalStatusInput } from '../interfaces/sucursal.interface';

/**
 * Alta de una sucursal bajo una empresa existente — hereda `document` (mismo RUC) y
 * `tenant_id` de la empresa padre (el tenant se duplica, identifica al grupo), pero genera
 * su propio `public_id` único (lo único expuesto en URLs). Arranca en `status: 'ACTIVE'` y
 * `is_enabled: null` (esa columna es exclusiva de empresa principal). Antes de crearla valida
 * que la empresa no haya alcanzado el límite de sucursales de su plan (ver
 * saas/service/planLimits.service.ts::assertPlanLimit).
 */
export const register = async (companyPublicId: string, data: RegisterSucursalInput, user: AuthenticatedUser) => {
    const parent = await CompanyRepository.findByPublicId(companyPublicId);
    if (!parent) throw new NotFoundError('Empresa no encontrada');

    assertCompanyScope(user, parent.company_id, 'No tenés acceso a esta empresa');

    const country = await CountryRepository.findById(data.country_id);
    if (!country) throw new BadRequestError('El país seleccionado no existe.');
    if (!country.is_active) throw new BadRequestError('El país seleccionado no está disponible actualmente.');

    const sucursal = await sequelize.transaction(async (transaction) => {
        await PlanLimitsService.lockCompanies([parent.company_id], transaction);
        const currentSucursales = await CompanyRepository.countSucursalesByParentId(parent.company_id, transaction);
        await PlanLimitsService.assertPlanLimit(parent.company_id, 'maxSubsidiaries', currentSucursales, transaction);

        const publicId = idPublicId();

        return CompanyRepository.create({
            name: data.name,
            address: data.address,
            document: parent.document,
            phone_cell: data.phone_cell,
            phone: data.phone || null,
            website: data.website || null,
            country_id: data.country_id,
            ubigeo_id: data.ubigeo_id,
            tenant_id: parent.tenant_id,
            public_id: publicId,
            parent_company_id: parent.company_id,
            status: 'ACTIVE',
            postal_code: null,
            latitude: data.latitude != null ? String(data.latitude) : null,
            longitude: data.longitude != null ? String(data.longitude) : null,
            description: data.description || null,
            is_enabled: null,
            user_create: user.user_id,
            user_update: null,
        }, transaction);
    });

    return CompanyRepository.findSucursalByPublicId(sucursal.public_id) as Promise<Company>;
};

// Scope sobre la sucursal ya resuelta — system entra a cualquiera, otro rol solo
// si está en su company_ids (ver accessScope.ts).
const assertSucursalAccess = (sucursal: Company, user: AuthenticatedUser) => {
    assertCompanyScope(user, sucursal.company_id, 'No tenés acceso a esta sucursal');
};

export const getByPublicId = async (publicId: string, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(publicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');

    assertSucursalAccess(sucursal, user);
    return sucursal;
};

export const updateByPublicId = async (publicId: string, data: UpdateSucursalInput, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(publicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');

    assertSucursalAccess(sucursal, user);

    if (data.country_id !== undefined) {
        const country = await CountryRepository.findById(data.country_id);
        if (!country) throw new BadRequestError('El país seleccionado no existe.');
        if (!country.is_active) throw new BadRequestError('El país seleccionado no está disponible actualmente.');
    }

    const updateFields: Partial<InferAttributes<Company>> = { user_update: user.user_id };
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.address !== undefined) updateFields.address = data.address;
    if (data.country_id !== undefined) updateFields.country_id = data.country_id;
    if (data.ubigeo_id !== undefined) updateFields.ubigeo_id = data.ubigeo_id;
    if (data.phone_cell !== undefined) updateFields.phone_cell = data.phone_cell;
    if (data.phone !== undefined) updateFields.phone = data.phone;
    if (data.latitude !== undefined) updateFields.latitude = data.latitude != null ? String(data.latitude) : null;
    if (data.longitude !== undefined) updateFields.longitude = data.longitude != null ? String(data.longitude) : null;
    if (data.description !== undefined) updateFields.description = data.description;
    if (data.website !== undefined) updateFields.website = data.website || null;

    await CompanyRepository.update(sucursal, updateFields);

    return CompanyRepository.findSucursalByPublicId(publicId) as Promise<Company>;
};

// Cambio de estado de la sucursal
export const toggleStatus = async (publicId: string, data: SucursalStatusInput, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(publicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');

    assertSucursalAccess(sucursal, user);

    await CompanyRepository.update(sucursal, {
        status: data.status,
        user_update: user.user_id,
    });

    return CompanyRepository.findSucursalByPublicId(publicId) as Promise<Company>;
};
