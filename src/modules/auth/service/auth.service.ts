import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as UserRepository from '../../users/repository/user.repository';
import { resolveAuthorization } from './authorizationResolver.service';
import { UnauthorizedError, ForbiddenError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';

interface LoginAdminInput {
    email: string;
    password: string;
}

/**
 * Login del panel admin. Bloquea usuarios con role 'cliente' — ese rol es
 * exclusivo del portal de reservas (BOOKING), no tiene acceso a este panel.
 *
 * El JWT lleva deliberadamente poco: {user_id, role_id, app}. permissions/
 * company_ids/scope_level NO viajan ahí — se resuelven en caliente en cada
 * request (ver resolveAuthorization, modules/auth/middlewares) contra
 * dsg_bss_role_permission/dsg_bss_user_permissions/dsg_bss_user_company, así
 * que editar los permisos de un rol aplica de inmediato a cualquier usuario
 * ya logueado, sin esperar a que renueve el token.
 *
 * Acá se llama al mismo resolver una vez más, solo para devolver
 * permissions/companyIds en el BODY de la respuesta — el front los guarda en
 * sessionStore únicamente para pistas de UI (ocultar botones), nunca como
 * fuente de autorización real.
 */
export const loginAdmin = async ({ email, password }: LoginAdminInput) => {
    const user = await UserRepository.findByEmailForLogin(email);

    if (!user || !user.password) {
        throw new UnauthorizedError('Credenciales requeridas');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
        throw new UnauthorizedError('Contraseña incorrecta');
    }

    if (user.roleRef?.key === 'cliente') {
        throw new ForbiddenError('Este usuario no tiene acceso a esta app');
    }

    if (!user.is_enabled) {
        throw new ForbiddenError('Usuario deshabilitado');
    }

    const userId = Number(user.user_id);
    const roleId = Number(user.role_id);

    const { permissions, companyIds } = await resolveAuthorization(userId, roleId);

    const payload: Pick<AuthenticatedUser, 'user_id' | 'role_id' | 'app'> = {
        user_id: userId,
        role_id: roleId,
        app: 'admin',
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
        expiresIn: (process.env.JWT_EXPIRES || '12h') as jwt.SignOptions['expiresIn'],
    });

    return { token, user, permissions, companyIds };
};
