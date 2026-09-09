import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/CustomErrors';
import { hasFullCompanyAccess } from '../utils/accessScope';

/**
 * Middleware: verificarScope
 *
 * Controla el alcance a datos (data scope) del usuario autenticado — no si
 * PUEDE hacer la acción (eso es verificarPermiso), sino sobre QUÉ empresa o
 * sucursal la puede hacer. Aplica a super_admin, administrador y empleado;
 * system queda exento (allowSystem, acceso total sin restricción).
 * Debe usarse DESPUÉS de verificarTokenAuth y verificarPermiso.
 *
 * company_ids del JWT ya viene expandido desde el login (AuthService): para
 * super_admin incluye la(s) empresa(s) raíz asignadas MÁS todas sus
 * sucursales; para administrador/empleado son directamente sus sucursales
 * asignadas. Este middleware no resuelve jerarquía en runtime — solo
 * verifica membresía plana contra ese array ya resuelto.
 *
 * El company_id solicitado se lee de (en orden de prioridad):
 *   1. req.params.companyId
 *   2. req.params.id
 *   3. req.body.sucursal_id  (para rutas POST sin param)
 *   4. req.body.company_id
 */
interface VerificarScopeOptions {
    /** Si true (por defecto), system siempre pasa. */
    allowSystem?: boolean;
}

export const verificarScope = (options: VerificarScopeOptions = {}) => {
    const { allowSystem = true } = options;

    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new UnauthorizedError('Autenticación requerida'));
            return;
        }

        // role es string en el JWT post-migración (ya no existe roles[] array)
        const { company_ids = [] } = req.user;

        if (allowSystem && hasFullCompanyAccess(req.user)) {
            next();
            return;
        }

        // Resolver el company_id del request
        const rawId =
            req.params.companyId ||
            req.params.id ||
            req.body?.sucursal_id ||
            req.body?.company_id;

        const requestedId = parseInt(rawId, 10);

        if (!rawId || isNaN(requestedId)) {
            // Si no hay ID en el request, dejamos pasar (la ruta no necesita scope de empresa)
            next();
            return;
        }

        // Verificar que el company_id está en la lista de accesos del JWT
        if (!company_ids.includes(requestedId)) {
            next(new ForbiddenError(
                'No tienes acceso a esta empresa o sucursal.',
                { requested: requestedId, allowed: company_ids }
            ));
            return;
        }

        next();
    };
};

/**
 * Variante directa sin opciones (caso más común).
 * Equivale a verificarScope() con allowSystem: true.
 */
export const verificarScopeDefault = verificarScope();
