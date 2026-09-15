/**
 * authorizationResolver.service.ts
 *
 * Resuelve rol/permisos/company_ids/scope_level EN CALIENTE, contra BD (con
 * cache Redis invalidable), en vez de leerlos de un JWT armado una sola vez
 * en el login. Por qué: con permisos editables por rol desde System > Roles,
 * si viajaran en el JWT, cambiar el rol no aplicaría hasta que cada usuario
 * ya logueado renueve su token — inaceptable para "modifico el rol y quiero
 * que aplique ya".
 *
 * Se llama desde dos lugares:
 *   - `resolveAuthorization` (modules/auth/middlewares) — en cada request autenticado.
 *   - `auth.service.ts::loginAdmin` — para devolver permissions/companyIds en el
 *     body de la respuesta de login (uso informativo del front, no de seguridad).
 *
 * La invalidación de este cache (invalidateRoleAuthCache/invalidateUserAuthCache) vive en
 * shared/utils/authorizationCache.ts, no acá — role.service.ts (system) y
 * userPermission.service.ts (users) necesitan invalidar sin depender de `auth`, que ya
 * depende de `system`/`users` para resolver (la relación inversa crearía una dependencia
 * circular entre módulos). Este archivo importa de ahí los mismos prefijos de clave, así
 * quien escribe el cache y quien lo invalida siempre coinciden en el formato.
 */
import cacheUtility from '../../../shared/utils/cacheUtility';
import { ROLE_AUTH_CACHE_PREFIX, USER_AUTH_CACHE_PREFIX } from '../../../shared/utils/authorizationCache';
import * as RoleRepository from '../../system/repository/role.repository';
import * as RolePermissionRepository from '../../system/repository/rolePermission.repository';
import * as UserRepository from '../../users/repository/user.repository';
import * as UserPermissionRepository from '../../users/repository/userPermission.repository';
import * as UserCompanyRepository from '../../users/repository/userCompany.repository';
import * as CompanyRepository from '../../companys/repository/company.repository';
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
    permissionKeys: string[];
}

const loadRoleData = async (roleId: number): Promise<RoleAuthData> => {
    return cacheUtility.withCache(ROLE_AUTH_CACHE_PREFIX, { roleId }, async () => {
        const role = await RoleRepository.findById(roleId);
        if (!role) throw new NotFoundError(`Rol ${roleId} no encontrado`);

        const permissionKeys = await RolePermissionRepository.findKeysByRoleId(roleId);
        return { key: role.key, scopeLevel: role.scope_level, permissionKeys };
    }, CACHE_TTL_SECONDS);
};

interface UserAuthData {
    roleId: number;
    isEnabled: boolean;
    overrides: { grant: string[]; revoke: string[] };
    companyIds: number[];
}

const loadUserData = async (userId: number): Promise<UserAuthData> => {
    return cacheUtility.withCache(USER_AUTH_CACHE_PREFIX, { userId }, async () => {
        const user = await UserRepository.findAuthStateById(userId);
        if (!user) throw new UnauthorizedError('Usuario no encontrado');

        const [overrides, empresaIds] = await Promise.all([
            UserPermissionRepository.findOverridesByUserId(userId),
            UserCompanyRepository.findActiveCompanyIdsByUserId(userId),
        ]);

        // Misma expansión que hacía antes auth.service.ts en el login: para super_admin,
        // sus empresas asignadas más todas las sucursales hijas; para administrador/empleado
        // (asignados directo a sucursales, sin hijas) es un no-op.
        const sucursalIds = await CompanyRepository.findSucursalIdsByParentIds(empresaIds);
        const companyIds = [...new Set([...empresaIds, ...sucursalIds])];

        return { roleId: Number(user.role_id), isEnabled: user.is_enabled, overrides, companyIds };
    }, CACHE_TTL_SECONDS);
};

/**
 * Autorización efectiva de un usuario, ya con excepciones aplicadas. El rol y el estado
 * habilitado salen de la BD, nunca del JWT: un usuario deshabilitado, o al que le cambiaron el
 * rol, pierde el acceso anterior en su próximo request.
 */
export const resolveAuthorization = async (userId: number): Promise<ResolvedAuthorization> => {
    const userData = await loadUserData(Number(userId));
    if (!userData.isEnabled) throw new UnauthorizedError('Usuario deshabilitado');

    const roleData = await loadRoleData(userData.roleId);

    const permissionSet = new Set(roleData.permissionKeys);
    userData.overrides.grant.forEach((key) => permissionSet.add(key));
    userData.overrides.revoke.forEach((key) => permissionSet.delete(key));

    return {
        roleId: userData.roleId,
        roleKey: roleData.key,
        scopeLevel: roleData.scopeLevel,
        permissions: Array.from(permissionSet),
        companyIds: userData.companyIds,
    };
};
