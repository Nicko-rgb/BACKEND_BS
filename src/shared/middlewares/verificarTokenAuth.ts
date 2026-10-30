/**
 * Middleware de autenticación JWT.
 */
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import * as AuthSessionRepository from '../../modules/auth/repository/authSession.repository';
import { UnauthorizedError } from '../errors/CustomErrors';
import type { AuthenticatedUser } from '../types/auth';

export const verificarTokenAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next(new UnauthorizedError('No autorizado. Token no proporcionado.'));
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string, { algorithms: ['HS256'] }) as AuthenticatedUser & jwt.JwtPayload;
        if (!decoded || typeof decoded !== 'object' || !decoded.exp ||
            !Number.isSafeInteger(decoded.user_id) || decoded.user_id <= 0 ||
            typeof decoded.jti !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded.jti)) {
            throw new UnauthorizedError('Sesión inválida. Vuelve a iniciar sesión.');
        }
        if (!await AuthSessionRepository.findActive(decoded.jti, decoded.user_id)) {
            throw new UnauthorizedError('Sesión cerrada. Vuelve a iniciar sesión.');
        }

        req.user = decoded;
        next();
    } catch (error) {
        // TokenExpiredError / JsonWebTokenError (jsonwebtoken) tienen rama propia en GlobalErrorHandler
        next(error);
    }
};
