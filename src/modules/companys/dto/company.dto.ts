import type { Company } from '../database/models';
import type { UserCompany } from '../../users/database/models';
import type { Ubigeo } from '../../system/database/models';
import type { CompanyPlanSummary } from '../../saas/repository/saasSubscription.repository';

// Arma "Distrito, Provincia, Departamento" a partir de un ubigeo con su cadena de padres ya
// incluida (parent → parent) — reusado para el de la empresa y el de cada sucursal en la grilla.
const formatUbigeo = (ubigeo?: Ubigeo): string | null => {
    if (!ubigeo) return null;
    const province = ubigeo.parent ?? null;
    const department = province?.parent ?? null;
    return [ubigeo.name, province?.name, department?.name].filter(Boolean).join(', ');
};

/**
 * Una entrada por usuario con todas las sucursales donde está asignado — en `user_companies`
 * hay una fila por sucursal, así que un mismo usuario puede venir repetido. El nombre sale de
 * `nameByCompanyId`, armado con la empresa y las sucursales ya cargadas.
 */
const toCompanyUsersDto = (
    assignments: UserCompany[],
    nameByCompanyId: Map<number, string>,
    publicByCompanyId: Map<number, string>,
) => {
    const byUserId = new Map<number, {
        publicId: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        role: string;
        sucursales: { publicId: string; name: string | null }[];
    }>();

    assignments.forEach((assignment) => {
        const user = assignment.user;
        if (!user) return;

        const userId = Number(user.user_id);
        if (!byUserId.has(userId)) {
            byUserId.set(userId, {
                publicId: user.public_id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                phone: user.person?.phone ?? null,
                role: assignment.role,
                sucursales: [],
            });
        }

        byUserId.get(userId)!.sucursales.push({
            publicId: publicByCompanyId.get(Number(assignment.company_id)) ?? String(assignment.company_id),
            name: nameByCompanyId.get(Number(assignment.company_id)) ?? null,
        });
    });

    return [...byUserId.values()];
};

/**
 * Objeto de respuesta para frontend para el listado de empresas, incluiye datos basicos
 */
export const toCompanyListDto = (company: Company, plan: CompanyPlanSummary | null = null) => {
    const owner = company.userAssignments?.[0]?.user ?? null;

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
export const toCompanyDetailDto = (company: Company, assignments: UserCompany[] = []) => {
    const owner = company.userAssignments?.[0]?.user ?? null;
    const district = company.ubigeo ?? null;

    const nameByCompanyId = new Map<number, string>([
        [Number(company.company_id), company.name],
        ...(company.subsidiaries ?? []).map((s) => [Number(s.company_id), s.name] as [number, string]),
    ]);
    const publicByCompanyId = new Map<number, string>([
        [Number(company.company_id), company.public_id],
        ...(company.subsidiaries ?? []).map((s) => [Number(s.company_id), s.public_id] as [number, string]),
    ]);

    return {
        publicId: company.public_id,
        name: company.name,
        document: company.document,
        address: company.address,
        phoneCell: company.phone_cell,
        phone: company.phone,
        isEnabled: company.is_enabled,
        country: company.country ? { name: company.country.country, flagUrl: company.country.flag_url, phoneCode: company.country.phone_code } : null,
        ubigeo: district ? {
            formatted: formatUbigeo(district)!,
        } : null,
        owner: owner ? {
            publicId: owner.public_id,
            firstName: owner.first_name,
            lastName: owner.last_name,
            email: owner.email,
            phone: owner.person?.phone ?? null,
            documentType: owner.person?.document_type ?? null,
            documentNumber: owner.person?.document_number ?? null,
            dateBirth: owner.person?.date_birth ?? null,
            country: owner.person?.country ? { id: owner.person.country.country_id, name: owner.person.country.country, flagUrl: owner.person.country.flag_url, phoneCode: owner.person.country.phone_code } : null,
        } : null,
        subsidiaries: (company.subsidiaries ?? []).map((s) => ({
            publicId: s.public_id,
            name: s.name,
            address: s.address,
            ubigeo: formatUbigeo(s.ubigeo),
        })),
        users: toCompanyUsersDto(assignments, nameByCompanyId, publicByCompanyId),
        createdAt: company.created_at,
    };
};
