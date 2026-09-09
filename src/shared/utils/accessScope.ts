import type { AuthenticatedUser } from '../types/auth';

/**
 * Acceso total a datos de cualquier empresa — regla general del sistema: el ALCANCE de
 * datos lo decide el rol, nunca un permiso (los permisos solo habilitan la acción, ver
 * verificarPermiso). Hoy el único rol sin restricción es `system`; el resto (super_admin,
 * administrador, empleado) siempre queda acotado a `company_ids`.
 *
 * Usado por `verificarScope` (exime del chequeo de un company_id puntual) y por cualquier
 * Service que liste datos propios de una empresa/sucursal (ej. company.service.ts) para
 * decidir si restringe el WHERE o no.
 */
export const hasFullCompanyAccess = (user: Pick<AuthenticatedUser, 'role'>): boolean => {
    return user.role === 'system';
};
