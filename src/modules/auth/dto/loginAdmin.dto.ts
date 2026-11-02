import type { User } from '../../users/database/models';
import type { CompanyContextNode } from '../../companys/interfaces/companyContext.interface';
import { toCompanyContextDto } from '../../companys/dto/companyContext.dto';

interface LoginAdminResult {
    token: string;
    user: User;
    permissions: string[];
    scopeLevel: number | null;
    context: CompanyContextNode[];
}

// Da forma a la respuesta del login — nunca expone el password hash ni el modelo Sequelize crudo.
// El usuario se expone por `public_id` (UUID), nunca por `user_id` (BIGINT interno) — mismo criterio
// que el resto de los DTOs del tenant (ver ARQUITECTURA_CAPAS.md). La PK numérica solo se usa
// internamente, para resolver permisos y company_ids contra la BD.
// Permisos, alcance y contexto son pistas de UI; los IDs internos quedan en el backend.
export const toLoginAdminDto = ({ token, user, permissions, scopeLevel, context }: LoginAdminResult) => ({
    token,
    user: {
        publicId: user.public_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.roleRef?.key ?? null,
    },
    permissions,
    scopeLevel,
    context: toCompanyContextDto(context),
});
