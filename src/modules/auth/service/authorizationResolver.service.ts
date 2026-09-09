/**
 * authorizationResolver.service.ts
 *
 * Resuelve permisos/company_ids/scope_level EN CALIENTE, contra BD (con
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
import * as UserPermissionRepository from '../../users/repository/userPermission.repository';
import * as UserCompanyRepository from '../../users/repository/userCompany.repository';
import * as CompanyRepository from '../../companys/repository/company.repository';
import { NotFoundError } from '../../../shared/errors/CustomErrors';

const CACHE_TTL_SECONDS = 300;

export interface ResolvedAuthorization {
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
    overrides: { grant: string[]; revoke: string[] };
    companyIds: number[];
}

const loadUserData = async (userId: number): Promise<UserAuthData> => {
    return cacheUtility.withCache(USER_AUTH_CACHE_PREFIX, { userId }, async () => {
        const [overrides, empresaIds] = await Promise.all([
            UserPermissionRepository.findOverridesByUserId(userId),
            UserCompanyRepository.findActiveCompanyIdsByUserId(userId),
        ]);

        // Misma expansión que hacía antes auth.service.ts en el login: para super_admin,
        // sus empresas asignadas más todas las sucursales hijas; para administrador/empleado
        // (asignados directo a sucursales, sin hijas) es un no-op.
        const sucursalIds = await CompanyRepository.findSucursalIdsByParentIds(empresaIds);
        const companyIds = [...new Set([...empresaIds, ...sucursalIds])];

        return { overrides, companyIds };
    }, CACHE_TTL_SECONDS);
};

/**
 * Permisos/company_ids/scope_level efectivos de un usuario, ya con excepciones aplicadas.
 */
export const resolveAuthorization = async (userId: number, roleId: number): Promise<ResolvedAuthorization> => {
    const [roleData, userData] = await Promise.all([loadRoleData(Number(roleId)), loadUserData(Number(userId))]);

    const permissionSet = new Set(roleData.permissionKeys);
    userData.overrides.grant.forEach((key) => permissionSet.add(key));
    userData.overrides.revoke.forEach((key) => permissionSet.delete(key));

    return {
        roleKey: roleData.key,
        scopeLevel: roleData.scopeLevel,
        permissions: Array.from(permissionSet),
        companyIds: userData.companyIds,
    };
};
