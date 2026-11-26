import type { Company } from '../../companys/database/models';
import type { User } from '../database/models';

/**
 * Una asignación ya normalizada: `entityId` es la empresa raíz o la sucursal a la
 * que el usuario tiene acceso (user_company / user_sucursal), con el usuario
 * resuelto. Un mismo usuario viene repetido si está asignado a varias entidades.
 */
export interface EntityAssignmentRow {
    entityId: number;
    user: User;
}

/**
 * Una entrada por usuario con todas las empresas/sucursales donde está asignado.
 * El nombre y el public_id salen de los mapas armados con la empresa y sus
 * sucursales ya cargadas.
 */
const toCompanyUsersDto = (
    assignments: EntityAssignmentRow[],
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

    assignments.forEach(({ entityId, user }) => {
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

        byUserId.get(userId)!.sucursales.push({
            publicId: publicByCompanyId.get(entityId)!,
            name: nameByCompanyId.get(entityId) ?? null,
        });
    });

    return [...byUserId.values()];
};

export const toCompanyAssignmentsDto = (company: Company, assignments: EntityAssignmentRow[]) => {
    const entities = [company, ...(company.subsidiaries ?? [])];
    return toCompanyUsersDto(
        assignments,
        new Map(entities.map((entity) => [Number(entity.company_id), entity.name])),
        new Map(entities.map((entity) => [Number(entity.company_id), entity.public_id])),
    );
};
