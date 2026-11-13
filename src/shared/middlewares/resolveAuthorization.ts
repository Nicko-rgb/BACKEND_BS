/**
 * Middleware: resolveAuthorization
 *
 * Autentica, resuelve la autorización vigente y exige al menos uno de los
 * permisos indicados. Sin argumentos solo exige una sesión válida y resuelve
 * el alcance. El acceso a la entidad concreta se valida en el service.
 *
 * verificarTokenAuth vive en shared/middlewares (mismo directorio).
 * La resolución de permisos/scope lee Role / UserPermission / UserCompany
 * desde modules/auth/service/authorizationResolver.service — shared puede
 * importar de modules sin crear dependencia circular.
 *
 * Uso:
 *   router.put('/company/:publicId', resolveAuthorization('company.edit'), handler);
 *   router.get('/my-menu', resolveAuthorization(), handler);
 *   router.get('/users', resolveAuthorization('user.manage_all', 'user.employee_manage'), handler);
 */
import type { Request, Response, NextFunction } from 'express';
import { verificarTokenAuth } from './verificarTokenAuth';
import { resolveAuthorization as resolve } from '../../modules/auth/service/authorizationResolver.service';
import { ForbiddenError, UnauthorizedError } from '../errors/CustomErrors';

export const resolveAuthorization = (...requiredPerms: string[]) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Adaptar el middleware de token a la secuencia async, sin ejecutar next antes de tiempo.
        await new Promise<void>((resolveToken, rejectToken) => {
            verificarTokenAuth(req, res, (error?: unknown) => {
                if (error) rejectToken(error);
                else resolveToken();
            }).catch(rejectToken);
        });

        if (!req.user) {
            throw new UnauthorizedError('Autenticación requerida');
        }

        const resolved = await resolve(req.user.user_id);
        req.user.role_id = resolved.roleId;
        req.user.role = resolved.roleKey;
        req.user.scope_level = resolved.scopeLevel;
        req.user.permissions = resolved.permissions;
        req.user.company_ids = resolved.companyIds;

        // system.full_access omite el chequeo de acción, nunca amplía el alcance de datos.
        if (
            requiredPerms.length > 0
            && !resolved.permissions.includes('system.full_access')
            && !requiredPerms.some((permission) => resolved.permissions.includes(permission))
        ) {
            throw new ForbiddenError('No tienes los permisos necesarios para esta acción', { required: requiredPerms });
        }
    } catch (error) {
        next(error);
        return;
    }

    next();
};
