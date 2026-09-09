/**
 * authorizationCache.ts
 *
 * Claves y helpers de invalidación del cache de autorización resuelta en
 * caliente (ver modules/auth/service/authorizationResolver.service.ts).
 * Vive acá, en `shared`, en vez de en `auth`, porque tanto `system`
 * (role.service.ts, al editar permisos/scope de un rol) como `users`
 * (userPermission.service.ts / asignaciones de empresa, al editar
 * excepciones de un usuario) necesitan invalidar sin depender de `auth` —
 * `auth` ya depende de `system`/`users` para resolver, así que la relación
 * inversa crearía una dependencia circular entre módulos.
 *
 * `authorizationResolver.service.ts` importa los mismos prefijos desde acá
 * para escribir el cache — una sola fuente de verdad para el formato de
 * clave entre quien escribe (resolver) y quien invalida (services).
 */
import cacheUtility from './cacheUtility';

export const ROLE_AUTH_CACHE_PREFIX = 'auth:role';
export const USER_AUTH_CACHE_PREFIX = 'auth:user';

// Invalida el cache de autorización de un rol — afecta a TODOS sus usuarios de una sola vez.
// Llamar al editar dsg_bss_role_permission o dsg_bss_role.scope_level.
export const invalidateRoleAuthCache = async (roleId: number): Promise<void> => {
    await cacheUtility.del(cacheUtility.generateKey(ROLE_AUTH_CACHE_PREFIX, { roleId }));
};

// Invalida el cache de autorización de un usuario. Llamar al editar sus excepciones
// (dsg_bss_user_permissions) o sus asignaciones de empresa/sucursal (dsg_bss_user_company).
export const invalidateUserAuthCache = async (userId: number): Promise<void> => {
    await cacheUtility.del(cacheUtility.generateKey(USER_AUTH_CACHE_PREFIX, { userId }));
};
