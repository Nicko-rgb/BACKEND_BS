import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import * as RoleRepository from '../repository/role.repository';
import * as RolePermissionRepository from '../repository/rolePermission.repository';
import * as PermissionRepository from '../repository/permission.repository';
import { invalidateRoleAuthCache } from '../../../shared/utils/authorizationCache';
import { countReferences } from '../../../shared/utils/checkReferences';
import { canAssignRole } from '../../../shared/utils/roleHierarchy';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import { NotFoundError, ConflictError, ValidationError } from '../../../shared/errors/CustomErrors';
import type { Role } from '../database/models';

// Roles sembrados por roleSeed — el resto del sistema los referencia por key (loginAdmin bloquea
// 'cliente', systemUserSeed busca 'system', etc.), así que nunca se pueden borrar aunque en un
// momento dado no tengan ningún usuario asignado.
const RESERVED_ROLE_KEYS = ['cliente', 'empleado', 'administrador', 'super_admin', 'system'];

// Alcance total y bypass de permisos — exclusivos del rol `system` (que solo otro system asigna,
// ver users/service/userManage.service.ts). Ningún otro rol puede recibirlos desde System > Roles.
const SYSTEM_SCOPE_LEVEL = 1;
const SYSTEM_FULL_ACCESS = 'system.full_access';

// dsg_bss_user vive en el módulo `users` — `system` no puede importar su modelo sin crear una
// dependencia circular (`users` ya importa `system`), así que el chequeo de uso cruza módulos
// solo con el nombre de tabla/columna real, vía countReferences (mismo criterio que
// permission.repository.ts con dsg_bss_user_permissions).
const USER_REFERENCE_CHECK = [{ table: 'dsg_bss_user', column: 'role_id' }];

// Catálogo completo de roles — chico, sin paginar.
// Catálogo completo para system (incluye roles creados desde System > Roles); para el resto, solo
// los roles que puede asignar.
export const listAll = async (user: AuthenticatedUser) => {
    const roles = await RoleRepository.findAll();
    if (user.permissions.includes('system.full_access')) return roles;

    return roles.filter((role) => canAssignRole(user, role.key));
};

export const getById = async (id: number) => {
    const role = await RoleRepository.findById(id);
    if (!role) throw new NotFoundError('Rol no encontrado');
    return role;
};

// ── Crea un rol nuevo — bloqueado si ya existe uno con la misma key ───
export const create = async (data: InferCreationAttributes<Role>) => {
    const existing = await RoleRepository.findByKey(data.key);
    if (existing) throw new ConflictError(`Ya existe un rol con la key "${data.key}"`);

    if (data.scope_level === SYSTEM_SCOPE_LEVEL) {
        throw new ValidationError('El nivel de alcance 1 es exclusivo del rol system');
    }

    return RoleRepository.create(data);
};

/**
 * Edición parcial de un rol (label/scope_level/is_active — `key` no se edita, ver role.dto.ts).
 * Invalida el cache de autorización de ese rol: si cambió scope_level, el nuevo alcance debe
 * aplicar de inmediato a todos los usuarios de ese rol, no recién en su próximo login.
 */
export const update = async (id: number, data: Partial<InferAttributes<Role>>) => {
    const role = await RoleRepository.findById(id);
    if (!role) throw new NotFoundError('Rol no encontrado');

    if (data.scope_level === SYSTEM_SCOPE_LEVEL && role.key !== 'system') {
        throw new ValidationError('El nivel de alcance 1 es exclusivo del rol system');
    }

    const updated = await RoleRepository.update(role, data);
    await invalidateRoleAuthCache(id);
    return updated;
};

// ── Elimina un rol — bloqueado si es uno de los 5 roles base, o si todavía tiene usuarios asignados ───
export const remove = async (id: number) => {
    const role = await RoleRepository.findById(id);
    if (!role) throw new NotFoundError('Rol no encontrado');

    if (RESERVED_ROLE_KEYS.includes(role.key)) {
        throw new ConflictError(`El rol "${role.key}" es uno de los roles base del sistema y no se puede eliminar`);
    }

    const usage = await countReferences(USER_REFERENCE_CHECK, [id]);
    if ((usage[id] ?? 0) > 0) {
        throw new ConflictError('No se puede eliminar un rol que todavía tiene usuarios asignados');
    }

    await RoleRepository.remove(role);
    await invalidateRoleAuthCache(id);
};

// Keys de los permisos base de un rol — para precargar el picker de checkboxes.
export const getPermissionKeys = async (id: number): Promise<string[]> => {
    const role = await RoleRepository.findById(id);
    if (!role) throw new NotFoundError('Rol no encontrado');

    return RolePermissionRepository.findKeysByRoleId(id);
};

/**
 * Reemplaza el set completo de permisos base de un rol. Valida contra el catálogo que todas las
 * keys existan (mismo criterio que userPermission.service.ts::replaceForUser). Invalida el cache
 * de autorización del rol — el cambio aplica de inmediato a TODOS los usuarios de ese rol, sin
 * esperar a que renueven sesión (esto es lo que resuelve el problema original: editar permisos
 * de un rol ya no requiere tocar usuario por usuario).
 */
export const replacePermissions = async (id: number, keys: string[]): Promise<string[]> => {
    const role = await RoleRepository.findById(id);
    if (!role) throw new NotFoundError('Rol no encontrado');

    if (role.key !== 'system' && keys.includes(SYSTEM_FULL_ACCESS)) {
        throw new ValidationError(`El permiso "${SYSTEM_FULL_ACCESS}" es exclusivo del rol system`);
    }

    if (keys.length > 0) {
        const found = await PermissionRepository.findByKeys(keys);
        const foundKeys = new Set(found.map((permission) => permission.key));
        const invalid = keys.filter((key) => !foundKeys.has(key));
        if (invalid.length > 0) {
            throw new ValidationError(`Permisos inexistentes: ${invalid.join(', ')}`);
        }
    }

    await RolePermissionRepository.replaceForRole(id, keys);
    await invalidateRoleAuthCache(id);
    return RolePermissionRepository.findKeysByRoleId(id);
};
