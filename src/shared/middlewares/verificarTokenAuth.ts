/**
 * Middleware de autenticación JWT.
 * Verifica el token Bearer y, si el token tiene `jti`, consulta la blacklist
 * de Redis para detectar tokens revocados (sesiones cerradas).
 */
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import redisClient from '../../config/redisConfig';
import { UnauthorizedError } from '../errors/CustomErrors';
import type { AuthenticatedUser } from '../types/auth';

// Ahora es async para poder consultar la blacklist de Redis
export const verificarTokenAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next(new UnauthorizedError('No autorizado. Token no proporcionado.'));
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthenticatedUser & { jti?: string };

        // Verificar blacklist solo si el token tiene jti (tokens nuevos con logout)
        if (decoded.jti) {
            const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
            if (isBlacklisted) {
                next(new UnauthorizedError('Sesión cerrada. Vuelve a iniciar sesión.'));
                return;
            }
        }

        req.user = decoded;
        next();
    } catch (error) {
        // TokenExpiredError / JsonWebTokenError (jsonwebtoken) tienen rama propia en GlobalErrorHandler
        next(error);
    }
};
