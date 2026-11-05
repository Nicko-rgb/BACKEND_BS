import type { AuthenticatedUser } from '../types/auth';
import { ForbiddenError } from '../errors/CustomErrors';

/**
 * scope_level=1 tiene alcance global. El dueño super_admin cubre su tenant;
 * Una asignación a empresa incluye sus sucursales; una asignación a sucursal
 * incluye su padre, sin incluir otras sucursales.
 * Los permisos efectivos habilitan cada acción.
 */
export const hasFullCompanyAccess = (user: Pick<AuthenticatedUser, 'scope_level'>): boolean => {
    return user.scope_level === 1;
};

type ScopeUser = Pick<AuthenticatedUser, 'scope_level' | 'company_ids'>;

/**
 * ¿Está esta empresa/sucursal en el alcance efectivo del usuario? `company_ids`
 * ya contiene los IDs resueltos según propiedad o empresa padre. La ruta
 * valida por separado el permiso de acción.
 */
export const hasCompanyScope = (user: ScopeUser, companyId: number): boolean => {
    return hasFullCompanyAccess(user) || (user.company_ids ?? []).includes(Number(companyId));
};

/**
 * Igual que arriba pero lanza 403 — la forma estándar de chequear scope en los
 * services, siempre DESPUÉS de resolver el `public_id` de la URL al `company_id`
 * interno. El mensaje se pasa en cada llamada para no perder el contexto
 * (empresa vs sucursal vs archivo).
 */
export const assertCompanyScope = (user: ScopeUser, companyId: number, message = 'No tenés acceso a esta empresa o sucursal.'): void => {
    if (!hasCompanyScope(user, companyId)) {
        throw new ForbiddenError(message);
    }
};
