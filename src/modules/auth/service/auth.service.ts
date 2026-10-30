import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import sequelize from '../../../config/db';
import * as AuthSessionRepository from '../repository/authSession.repository';
import * as UserRepository from '../../users/repository/user.repository';
import { resolveAuthorization } from './authorizationResolver.service';
import { UnauthorizedError, ForbiddenError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';

interface LoginAdminInput {
    email: string;
    password: string;
}

// Hash de relleno para comparar cuando el correo no existe
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password', 10);

/**
 * Login del panel admin. Bloquea usuarios con role 'cliente' — ese rol es
 * exclusivo del portal de reservas (BOOKING), no tiene acceso a este panel.
 */
export const loginAdmin = async ({ email, password }: LoginAdminInput) => {
    const user = await UserRepository.findByEmailForLogin(email);

    const passwordMatches = await bcrypt.compare(password, user?.password ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatches) {
        throw new UnauthorizedError('Credenciales inválidas');
    }

    if (user.roleRef?.key === 'cliente') {
        throw new ForbiddenError('Este usuario no tiene acceso a esta app');
    }

    if (!user.is_enabled) {
        throw new ForbiddenError('Usuario deshabilitado');
    }

    const userId = Number(user.user_id);
    const roleId = Number(user.role_id);

    const { permissions, companyIds, scopeLevel } = await resolveAuthorization(userId);

    const payload: Pick<AuthenticatedUser, 'user_id' | 'role_id' | 'app'> = {
        user_id: userId,
        role_id: roleId,
        app: 'admin',
    };

    const token = await sequelize.transaction(async (transaction) => {
        const currentUser = await UserRepository.lockById(userId, transaction);
        if (!currentUser || !currentUser.is_enabled || currentUser.password !== user.password || currentUser.role_id !== user.role_id) {
            throw new UnauthorizedError('Las credenciales cambiaron. Vuelve a iniciar sesión.');
        }
        const jti = randomUUID();
        const signedToken = jwt.sign(payload, process.env.JWT_SECRET as string, {
            expiresIn: process.env.JWT_EXPIRES as jwt.SignOptions['expiresIn'],
            jwtid: jti,
            algorithm: 'HS256',
        });
        const decoded = jwt.decode(signedToken) as jwt.JwtPayload;
        if (!decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) {
            throw new Error('JWT_EXPIRES debe indicar una duración positiva válida.');
        }
        await AuthSessionRepository.create(jti, userId, new Date(decoded.exp * 1000), transaction);
        return signedToken;
    });

    return { token, user, permissions, companyIds, scopeLevel };
};

export const logout = async (user: AuthenticatedUser): Promise<void> => {
    if (!user.jti) throw new UnauthorizedError('Sesión inválida');
    await AuthSessionRepository.revoke(user.jti, user.user_id);
};
