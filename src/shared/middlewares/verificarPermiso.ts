/**
 * Middleware verificarPermiso
 *
 * Valida que el usuario autenticado tenga AL MENOS UNO de los permisos indicados.
 * system.full_access bypasea cualquier chequeo.
 * Debe usarse DESPUÉS de resolveAuthorization (modules/auth/middlewares) —
 * necesita req.user.permissions ya resuelto.
 *
 * Uso:
 *   router.put('/confirm', resolveAuthorization, verificarPermiso('booking.confirm'), handler);
 *   router.get('/stats',   resolveAuthorization, verificarPermiso('statistics.view'), handler);
 */
import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/CustomErrors';

export const verificarPermiso = (...requiredPerms: string[]) => (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
        next(new UnauthorizedError('Token de autenticación requerido'));
        return;
    }

    const userPerms = req.user.permissions || [];

    // system.full_access bypasea cualquier chequeo de permiso
    if (userPerms.includes('system.full_access')) {
        next();
        return;
    }

    if (!requiredPerms.some(p => userPerms.includes(p))) {
        next(new ForbiddenError(
            'No tienes los permisos necesarios para esta acción',
            { required: requiredPerms }
        ));
        return;
    }

    next();
};
