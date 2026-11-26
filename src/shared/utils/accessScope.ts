import type { AuthenticatedUser } from '../types/auth';
import { ForbiddenError } from '../errors/CustomErrors';
import * as UserCompanyRepository from '../../modules/users/repository/userCompany.repository';

/**
 * Alcance de datos por entidad — única puerta de acceso. Solo primitivas: no resuelve
 * entidades (eso vive en el dominio, ver companys/service/entityResolver.service.ts).
 *
 * La fuente de verdad son las tablas de asignación explícita (`dsg_bss_user_company`
 * = usuario↔empresa, `dsg_bss_user_sucursal` = usuario↔sucursal), leídas por
 * `userCompany.repository`. `scope_level=1` (system) no tiene restricción.
 *
 * `company_id` y `sucursal_id` salen del mismo PK de `dsg_bss_company`, así que un id es
 * empresa o sucursal pero nunca ambos: alcanza con buscarlo en las dos tablas para saber
 * si el usuario tiene acceso, sin pasar el tipo de entidad. El chequeo es estricto por
 * entidad — una fila de sucursal no habilita su empresa padre, ni al revés.
 *
 * - `hasEntityAccess` / `assertEntityAccess` → chequeo puntual (id interno).
 * - `findAccessibleEntityIds` / `isEntityAccessible` → filtrar listas con un solo read.
 */

// scope_level=1 — sin restricción de entidad.
export const hasFullCompanyAccess = (user: Pick<AuthenticatedUser, 'scope_level'>): boolean => {
    return user.scope_level === 1;
};

type ScopeUser = Pick<AuthenticatedUser, 'scope_level' | 'user_id'>;

// ¿Tiene el usuario una fila de acceso activa para esta empresa o sucursal?
export const hasEntityAccess = async (user: ScopeUser, entityId: number): Promise<boolean> => {
    return hasFullCompanyAccess(user)
        || UserCompanyRepository.hasEntityAssignment(Number(user.user_id), Number(entityId));
};

/**
 * Igual que arriba pero lanza 403 con código propio. Distingue "tiene el permiso de la
 * acción pero no el acceso a la entidad" (este) de "no tiene el permiso" (lo lanza
 * resolveAuthorization con PERMISSION_DENIED): el frontend puede ofrecer solicitar el
 * acceso en vez de ocultar la acción.
 */
export const assertEntityAccess = async (
    user: ScopeUser,
    entityId: number,
    message = 'Tienes los permisos necesarios, pero no acceso a esta entidad. Solicitá el acceso a quien administra tu empresa.',
): Promise<void> => {
    if (!await hasEntityAccess(user, entityId)) {
        throw new ForbiddenError(message, null, 'ENTITY_SCOPE_DENIED');
    }
};

// Set de entidades con acceso — `undefined` = system (sin restricción). Un solo read,
// para filtrar listas (empresas, sucursales, usuarios, árbol) sin N consultas.
export const findAccessibleEntityIds = async (user: ScopeUser): Promise<number[] | undefined> => {
    return hasFullCompanyAccess(user) ? undefined : UserCompanyRepository.findActiveEntityIdsByUserId(Number(user.user_id));
};

// Chequeo en memoria contra el set ya resuelto (evita otra consulta por ítem).
export const isEntityAccessible = (accessibleIds: number[] | undefined, entityId: number): boolean => {
    return accessibleIds === undefined || accessibleIds.includes(Number(entityId));
};
