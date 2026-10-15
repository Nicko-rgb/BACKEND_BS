/**
 * authorizationCache.ts
 *
 * Claves y helpers de invalidación del cache de autorización resuelta en
 * caliente (ver modules/auth/service/authorizationResolver.service.ts).
 * Vive acá, en `shared`, en vez de en `auth`, porque tanto `system`
 * (role.service.ts, al editar el scope de un rol) como `users`
 * (userPermission.service.ts / asignaciones de empresa, al editar los
 * permisos de un usuario) necesitan invalidar sin depender de `auth` —
 * `auth` ya depende de `system`/`users` para resolver, así que la relación
 * inversa crearía una dependencia circular entre módulos.
 *
 * Nota: editar la PLANTILLA de un rol no invalida nada por sí sola — solo
 * afecta a usuarios nuevos. Si se propaga a existentes (sync), se invalida el
 * cache de cada usuario afectado, ver role.service.ts::replacePermissions.
 *
 * `authorizationResolver.service.ts` importa los mismos prefijos desde acá
 * para escribir el cache — una sola fuente de verdad para el formato de
 * clave entre quien escribe (resolver) y quien invalida (services).
 */
import cacheUtility from './cacheUtility';

export const ROLE_AUTH_CACHE_PREFIX = 'auth:role';
export const USER_AUTH_CACHE_PREFIX = 'auth:user';

// Invalida el cache de autorización de un rol.
// Llamar al editar dsg_bss_role.scope_level (el rol ya no aporta permisos,
// así que su plantilla no invalida nada).
export const invalidateRoleAuthCache = async (roleId: number): Promise<void> => {
    await cacheUtility.del(cacheUtility.generateKey(ROLE_AUTH_CACHE_PREFIX, { roleId }));
};

// Invalida el cache de autorización de un usuario. Llamar al editar su set de
// permisos (dsg_bss_user_permissions) o sus asignaciones de empresa/sucursal (dsg_bss_user_company).
export const invalidateUserAuthCache = async (userId: number): Promise<void> => {
    await cacheUtility.del(cacheUtility.generateKey(USER_AUTH_CACHE_PREFIX, { userId }));
};
