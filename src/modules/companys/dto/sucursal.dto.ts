import type { Company } from '../database/models';

/**
 * Forma de una sucursal para el frontend — mismo criterio que `toCompanyDetailDto`: país y
 * ubigeo con sus ids (para precargar el form de edición) además del nombre formateado.
 * `companyTenantId` es el `tenant_id` de la empresa padre (`parentCompany`, incluido por
 * `findSucursalByTenantId`), para el link "volver a la empresa" en el frontend.
 */
export const toSucursalDto = (sucursal: Company) => {
    const district = sucursal.ubigeo ?? null;
    const province = district?.parent ?? null;
    const department = province?.parent ?? null;

    return {
        tenantId: sucursal.tenant_id,
        companyTenantId: sucursal.parentCompany?.tenant_id ?? null,
        name: sucursal.name,
        address: sucursal.address,
        phoneCell: sucursal.phone_cell,
        phone: sucursal.phone,
        latitude: sucursal.latitude,
        longitude: sucursal.longitude,
        description: sucursal.description,
        website: sucursal.website,
        status: sucursal.status,
        country: sucursal.country ? { id: sucursal.country.country_id, name: sucursal.country.country, flagUrl: sucursal.country.flag_url, phoneCode: sucursal.country.phone_code } : null,
        ubigeo: district ? {
            id: district.ubigeo_id,
            district: district.name,
            province: province?.name ?? null,
            provinceId: province?.ubigeo_id ?? null,
            department: department?.name ?? null,
            departmentId: department?.ubigeo_id ?? null,
            formatted: [district.name, province?.name, department?.name].filter(Boolean).join(', '),
        } : null,
        createdAt: sucursal.created_at,
    };
};
