/**
 * Middleware: resolveAuthorization
 *
 * Autentica, resuelve la autorización vigente y exige al menos uno de los
 * permisos indicados. Sin argumentos solo exige una sesión válida y resuelve
 * el alcance. El acceso a la entidad concreta se valida en el service.
 *
 * verificarTokenAuth sigue viviendo en shared/middlewares, no acá: ahí no
 * puede importar modelos de otros módulos sin crear una dependencia
 * circular, y la resolución de permisos/scope sí necesita leer Role/
 * UserPermission/UserCompany — por eso vive en `auth`, que sí
 * puede importar esos módulos (igual que ya hace auth.service.ts para el
 * login). Este middleware compone los tres pasos; verificarTokenAuth sigue
 * siendo una pieza aparte, usable sola si algún día hiciera falta solo
 * autenticación sin resolver todo el árbol de permisos.
 *
 * Uso:
 *   router.put('/company/:publicId', resolveAuthorization('company.edit'), handler);
 *   router.get('/my-menu', resolveAuthorization(), handler);
 *   router.get('/users', resolveAuthorization('user.manage_all', 'user.employee_manage'), handler);
 */
import type { Request, Response, NextFunction } from 'express';
import { verificarTokenAuth } from '../../../shared/middlewares/verificarTokenAuth';
import { resolveAuthorization as resolve } from '../service/authorizationResolver.service';
import { ForbiddenError, UnauthorizedError } from '../../../shared/errors/CustomErrors';

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
