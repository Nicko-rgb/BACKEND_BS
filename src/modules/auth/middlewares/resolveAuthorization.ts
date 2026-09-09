/**
 * Middleware: resolveAuthorization
 *
 * Deja la ruta completamente protegida con un solo middleware: primero
 * valida el token (delega en verificarTokenAuth, shared) y, si es válido,
 * completa req.user con permissions/company_ids/scope_level/role resueltos
 * en caliente — ver authorizationResolver.service.ts.
 *
 * verificarTokenAuth sigue viviendo en shared/middlewares, no acá: ahí no
 * puede importar modelos de otros módulos sin crear una dependencia
 * circular, y la resolución de permisos/scope sí necesita leer Role/
 * RolePermission/UserPermission/UserCompany — por eso vive en `auth`, que sí
 * puede importar esos módulos (igual que ya hace auth.service.ts para el
 * login). Este middleware compone ambos pasos; verificarTokenAuth sigue
 * siendo una pieza aparte, usable sola si algún día hiciera falta solo
 * autenticación sin resolver todo el árbol de permisos.
 *
 * Uso: reemplaza al par verificarTokenAuth + resolveAuthorization — ya no
 * hace falta encadenar los dos.
 *   router.get('/x', resolveAuthorization, verificarPermiso('x'), handler);
 */
import type { Request, Response, NextFunction } from 'express';
import { verificarTokenAuth } from '../../../shared/middlewares/verificarTokenAuth';
import { resolveAuthorization as resolve } from '../service/authorizationResolver.service';
import { UnauthorizedError } from '../../../shared/errors/CustomErrors';

export const resolveAuthorization = (req: Request, res: Response, next: NextFunction): void => {
    verificarTokenAuth(req, res, async (err?: unknown) => {
        if (err) {
            next(err);
            return;
        }

        if (!req.user) {
            next(new UnauthorizedError('Autenticación requerida'));
            return;
        }

        try {
            const resolved = await resolve(req.user.user_id, req.user.role_id);
            req.user.role = resolved.roleKey;
            req.user.scope_level = resolved.scopeLevel;
            req.user.permissions = resolved.permissions;
            req.user.company_ids = resolved.companyIds;
            next();
        } catch (error) {
            next(error);
        }
    });
};
