/**
 * authorizationResolver.service.ts
 *
 * Resuelve rol/permisos/scope_level contra BD (con
 * cache Redis invalidable) y company_ids sin cache, en vez de leerlos de un JWT
 * en el login. Por qué: con permisos editables por usuario, si viajaran en el
 * JWT, cambiar un permiso no aplicaría hasta que cada usuario ya logueado
 * renueve su token — inaceptable para "modifico el permiso y quiero que aplique ya".
 *
 * Modelo de autorización:
 *   - permisos efectivos = filas de dsg_bss_user_permissions del usuario (set
 *     completo, sin excepciones). dsg_bss_role_permission es solo la PLANTILLA
 *     que se copia al crear un usuario nuevo — editarla no toca existentes.
 *   - el rol aporta etiqueta, menú y el alcance global de system.
 *   - las membresías y la propiedad determinan el árbol de los demás usuarios.
 *
 * Se llama desde dos lugares:
 *   - `resolveAuthorization` (modules/auth/middlewares) — en cada request autenticado.
 *   - `auth.service.ts::loginAdmin` — para obtener los permisos y construir el contexto
 *     del frontend. companyIds permanece interno y no se devuelve en el login.
 *
 * La invalidación de este cache (invalidateRoleAuthCache/invalidateUserAuthCache) vive en
 * shared/utils/authorizationCache.ts, no acá — role.service.ts (system, al editar
 * scope de un rol) y userPermission.service.ts (users, al editar permisos de un
 * usuario) necesitan invalidar sin depender de `auth`, que ya depende de
 * `system`/`users` para resolver (la relación inversa crearía una dependencia
 * circular entre módulos). Este archivo importa de ahí los mismos prefijos de clave, así
 * quien escribe el cache y quien lo invalida siempre coinciden en el formato.
 */
import cacheUtility from '../../../shared/utils/cacheUtility';
import { ROLE_AUTH_CACHE_PREFIX, USER_AUTH_CACHE_PREFIX } from '../../../shared/utils/authorizationCache';
import * as RoleRepository from '../../system/repository/role.repository';
import * as UserRepository from '../../users/repository/user.repository';
import * as UserPermissionRepository from '../../users/repository/userPermission.repository';
import * as UserCompanyRepository from '../../users/repository/userCompany.repository';
import { NotFoundError, UnauthorizedError } from '../../../shared/errors/CustomErrors';

const CACHE_TTL_SECONDS = 300;

export interface ResolvedAuthorization {
    roleId: number;
    roleKey: string;
    scopeLevel: number | null;
    permissions: string[];
    companyIds: number[];
}

interface RoleAuthData {
    key: string;
    scopeLevel: number | null;
}

const loadRoleData = async (roleId: number): Promise<RoleAuthData> => {
    return cacheUtility.withCache(ROLE_AUTH_CACHE_PREFIX, { roleId }, async () => {
        const role = await RoleRepository.findById(roleId);
        if (!role) throw new NotFoundError(`Rol ${roleId} no encontrado`);

        return { key: role.key, scopeLevel: role.scope_level };
    }, CACHE_TTL_SECONDS);
};

interface UserAuthData {
    roleId: number;
    isEnabled: boolean;
    permissionKeys: string[];
}

const loadUserData = async (userId: number): Promise<UserAuthData> => {
    return cacheUtility.withCache(USER_AUTH_CACHE_PREFIX, { userId }, async () => {
        const user = await UserRepository.findAuthStateById(userId);
        if (!user) throw new UnauthorizedError('Usuario no encontrado');

        const permissionKeys = await UserPermissionRepository.findKeysByUserId(userId);
        return { roleId: Number(user.role_id), isEnabled: user.is_enabled, permissionKeys };

    }, CACHE_TTL_SECONDS);
};

/**
 * Autorización efectiva de un usuario: sus permisos salen de sus propias filas
 * (dsg_bss_user_permissions), el rol y el estado habilitado de la BD, nunca del
 * JWT: un usuario deshabilitado, o al que le cambiaron permisos o rol, pierde el
 * acceso anterior en su próximo request.
 */
export const resolveAuthorization = async (userId: number): Promise<ResolvedAuthorization> => {
    const userData = await loadUserData(Number(userId));
    if (!userData.isEnabled) throw new UnauthorizedError('Usuario deshabilitado');

    const roleData = await loadRoleData(userData.roleId);
    const companyIds = roleData.scopeLevel === 1 ? [] : await UserCompanyRepository.findEffectiveCompanyIdsByUserId(userId);

    return {
        roleId: userData.roleId,
        roleKey: roleData.key,
        scopeLevel: roleData.scopeLevel,
        permissions: userData.permissionKeys,
        companyIds,
    };
};
