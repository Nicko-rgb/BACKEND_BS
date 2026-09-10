import type { Company } from '../database/models';
import type { CompanyPlanSummary } from '../../saas/repository/saasSubscription.repository';

/**
 * Forma de una empresa principal para el frontend — incluye su dueño (primer
 * `userAssignments` con role 'super_admin', cargado por include en el repository) y su
 * plan (resuelto aparte en el service, vía saasSubscription.repository, porque `companys`
 * no puede importar modelos de `saas`). Ambos vienen `null` si todavía no están asignados
 * — empresa recién creada, pendiente de completar el alta.
 */
export const toCompanyListDto = (company: Company, plan: CompanyPlanSummary | null = null) => {
    const owner = company.userAssignments?.[0]?.user ?? null;

    return {
        id: company.company_id,
        tenantId: company.tenant_id,
        name: company.name,
        document: company.document,
        phoneCell: company.phone_cell,
        website: company.website,
        country: company.country ? { name: company.country.country, flagUrl: company.country.flag_url, phoneCode: company.country.phone_code } : null,
        isEnabled: company.is_enabled,
        owner: owner ? {
            id: owner.user_id,
            name: [owner.first_name, owner.last_name].filter(Boolean).join(' '),
            email: owner.email,
            phone: owner.person?.phone ?? null,
            documentType: owner.person?.document_type ?? null,
            documentNumber: owner.person?.document_number ?? null,
            country: owner.person?.country ? { name: owner.person.country.country, flagUrl: owner.person.country.flag_url, phoneCode: owner.person.country.phone_code } : null,
        } : null,
        plan: plan ? {
            id: plan.planId,
            name: plan.planName,
            code: plan.planCode,
            status: plan.status,
        } : null,
        createdAt: company.created_at,
    };
};

/**
 * Detalle de una empresa (página de "Ver empresa") — país, dueño, ubigeo formateado
 * (distrito, provincia, departamento — resuelto por `findByTenantId` con la cadena de
 * padres del ubigeo ya incluida) y sus sucursales (solo `name`, la vista de detalle de
 * sucursal todavía no existe).
 */
export const toCompanyDetailDto = (company: Company) => {
    const owner = company.userAssignments?.[0]?.user ?? null;
    const district = company.ubigeo ?? null;
    const province = district?.parent ?? null;
    const department = province?.parent ?? null;

    return {
        id: company.company_id,
        name: company.name,
        document: company.document,
        address: company.address,
        phoneCell: company.phone_cell,
        phone: company.phone,
        isEnabled: company.is_enabled,
        country: company.country ? { name: company.country.country, flagUrl: company.country.flag_url, phoneCode: company.country.phone_code } : null,
        ubigeo: district ? {
            district: district.name,
            province: province?.name ?? null,
            department: department?.name ?? null,
            formatted: [district.name, province?.name, department?.name].filter(Boolean).join(', '),
        } : null,
        owner: owner ? {
            id: owner.user_id,
            name: [owner.first_name, owner.last_name].filter(Boolean).join(' '),
            email: owner.email,
            phone: owner.person?.phone ?? null,
            documentType: owner.person?.document_type ?? null,
            documentNumber: owner.person?.document_number ?? null,
            country: owner.person?.country ? { name: owner.person.country.country, flagUrl: owner.person.country.flag_url, phoneCode: owner.person.country.phone_code } : null,
        } : null,
        subsidiaries: (company.subsidiaries ?? []).map((s) => ({ name: s.name })),
        createdAt: company.created_at,
    };
};
