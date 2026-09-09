import type { AuthenticatedUser } from '../types/auth';

/**
 * Acceso total a datos de cualquier empresa — regla general del sistema: el ALCANCE de
 * datos lo decide el rol (vía su scope_level en dsg_bss_role), nunca un permiso (los
 * permisos solo habilitan la acción, ver verificarPermiso). scope_level=1 es el único
 * nivel sin restricción (hoy, `system`); el resto siempre queda acotado a `company_ids`.
 *
 * Usado por `verificarScope` (exime del chequeo de un company_id puntual) y por cualquier
 * Service que liste datos propios de una empresa/sucursal (ej. company.service.ts) para
 * decidir si restringe el WHERE o no.
 */
export const hasFullCompanyAccess = (user: Pick<AuthenticatedUser, 'scope_level'>): boolean => {
    return user.scope_level === 1;
};
