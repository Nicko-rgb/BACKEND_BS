import type { AuthenticatedUser } from '../types/auth';
import { ForbiddenError } from '../errors/CustomErrors';

/**
 * Acceso total a datos de cualquier empresa — regla general del sistema: el ALCANCE de
 * datos lo decide el rol (vía su scope_level en dsg_bss_role), nunca un permiso (los
 * permisos solo habilitan la acción, ver verificarPermiso). scope_level=1 es el único
 * nivel sin restricción (hoy, `system`); el resto siempre queda acotado a `company_ids`.
 */
export const hasFullCompanyAccess = (user: Pick<AuthenticatedUser, 'scope_level'>): boolean => {
    return user.scope_level === 1;
};

type ScopeUser = Pick<AuthenticatedUser, 'scope_level' | 'company_ids'>;

/**
 * ¿Está esta empresa/sucursal dentro del alcance del usuario? `company_ids` ya viene
 * expandido por resolveAuthorization (para super_admin incluye sus empresas raíz MÁS sus
 * sucursales; para administrador/empleado, sus sucursales) — acá solo se verifica
 * membresía plana contra ese array ya resuelto.
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
