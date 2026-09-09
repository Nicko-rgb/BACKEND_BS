import type { User } from '../../users/database/models';

interface LoginAdminResult {
    token: string;
    user: User;
    permissions: string[];
    companyIds: number[];
}

// Da forma a la respuesta del login — nunca expone el password hash ni el modelo Sequelize crudo.
// permissions/companyIds van también acá (duplicados con lo que ya lleva el
// JWT) para que el front los pueda leer directo sin decodificar el token.
export const toLoginAdminDto = ({ token, user, permissions, companyIds }: LoginAdminResult) => ({
    token,
    user: {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
    },
    permissions,
    companyIds,
});
