import type { User } from '../../users/database/models';

interface LoginAdminResult {
    token: string;
    user: User;
    permissions: string[];
    companyIds: number[];
    scopeLevel: number | null;
}

// Da forma a la respuesta del login — nunca expone el password hash ni el modelo Sequelize crudo.
// El usuario se expone por `public_id` (UUID), nunca por `user_id` (BIGINT interno) — mismo criterio
// que el resto de los DTOs del tenant (ver ARQUITECTURA_CAPAS.md). La PK numérica solo se usa
// internamente, para resolver permisos y company_ids contra la BD.
// permissions/companyIds/scopeLevel van también acá (a diferencia del JWT, que ya no los lleva — ver
// auth.service.ts) para que el front los pueda usar directo como pistas de UI.
export const toLoginAdminDto = ({ token, user, permissions, companyIds, scopeLevel }: LoginAdminResult) => ({
    token,
    user: {
        publicId: user.public_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.roleRef?.key ?? null,
    },
    permissions,
    companyIds,
    scopeLevel,
});
