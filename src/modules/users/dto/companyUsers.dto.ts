import type { Company } from '../../companys/database/models';
import type { UserCompany } from '../database/models';

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
        documentType: string | null;
        documentNumber: string | null;
        dateBirth: string | null;
        country: { id: number; name: string; flagUrl: string; phoneCode: string } | null;
        sucursales: { publicId: string; name: string | null }[];
    }>();

    assignments.forEach((assignment) => {
        const user = assignment.user;
        if (!user) return;

        const userId = Number(user.user_id);
        if (!byUserId.has(userId)) {
            const country = user.country ?? null;
            byUserId.set(userId, {
                publicId: user.public_id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                phone: user.phone ?? null,
                role: user.roleRef?.key ?? '',
                documentType: user.document_type ?? null,
                documentNumber: user.document_number ?? null,
                dateBirth: user.date_birth ?? null,
                country: country ? {
                    id: Number(country.country_id),
                    name: country.country,
                    flagUrl: country.flag_url,
                    phoneCode: country.phone_code,
                } : null,
                sucursales: [],
            });
        }

        const entityId = assignment.is_owner ? nameByCompanyId.keys().next().value! : Number(assignment.company_id);
        byUserId.get(userId)!.sucursales.push({
            publicId: publicByCompanyId.get(entityId)!,
            name: nameByCompanyId.get(entityId) ?? null,
        });
    });

    return [...byUserId.values()];
};

export const toCompanyAssignmentsDto = (company: Company, assignments: UserCompany[]) => {
    const entities = [company, ...(company.subsidiaries ?? [])];
    return toCompanyUsersDto(
        assignments,
        new Map(entities.map((entity) => [Number(entity.company_id), entity.name])),
        new Map(entities.map((entity) => [Number(entity.company_id), entity.public_id])),
    );
};

