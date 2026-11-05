import type { Company } from '../database/models';
import type { Ubigeo } from '../../system/database/models';
import type { CompanyPlanSummary } from '../../saas/interfaces/plan.interface';

// Arma "Distrito, Provincia, Departamento" a partir de un ubigeo con su cadena de padres ya
// incluida (parent → parent) — reusado para el de la empresa y el de cada sucursal en la grilla.
const formatUbigeo = (ubigeo?: Ubigeo): string | null => {
    if (!ubigeo) return null;
    const province = ubigeo.parent ?? null;
    const department = province?.parent ?? null;
    return [ubigeo.name, province?.name, department?.name].filter(Boolean).join(', ');
};

/**
 * Objeto de respuesta para frontend para el listado de empresas, incluiye datos basicos
 */
export const toCompanyListDto = (company: Company, plan: CompanyPlanSummary | null = null) => {
    const owner = company.ownerAssignments?.[0]?.user ?? null;

    return {
        publicId: company.public_id,
        name: company.name,
        document: company.document,
        phoneCell: company.phone_cell,
        isEnabled: company.is_enabled,
        country: company.country ? { 
            name: company.country.country,
            flagUrl: company.country.flag_url,
            phoneCode: company.country.phone_code
        } : null,
        owner: owner ? {
            firstName: owner.first_name,
            lastName: owner.last_name,
            email: owner.email,
        } : null,
        plan: plan ? {
            name: plan.planName,
            code: plan.planCode,
            status: plan.status,
        } : null,
        createdAt: company.created_at,
    };
};

/**
 * Detalle de una empresa (página de "Ver empresa")
 */
export const toCompanyDetailDto = (company: Company) => {
    const district = company.ubigeo ?? null;
    const province = district?.parent ?? null;
    const department = province?.parent ?? null;

    return {
        publicId: company.public_id,
        name: company.name,
        document: company.document,
        address: company.address,
        phoneCell: company.phone_cell,
        phone: company.phone,
        isEnabled: company.is_enabled,
        country: company.country ? { id: company.country.country_id, name: company.country.country, flagUrl: company.country.flag_url, phoneCode: company.country.phone_code } : null,
        ubigeo: district ? {
            id: district.ubigeo_id,
            district: district.name,
            province: province?.name ?? null,
            provinceId: province?.ubigeo_id ?? null,
            department: department?.name ?? null,
            departmentId: department?.ubigeo_id ?? null,
            formatted: formatUbigeo(district)!,
        } : null,
        createdAt: company.created_at,
    };
};
