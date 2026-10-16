import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import * as PermissionRepository from '../repository/permission.repository';
import { countPermissionUsageInRoutes } from '../utils/permissionUsage';
import cacheUtility from '../../../shared/utils/cacheUtility';
import { NotFoundError, ConflictError } from '../../../shared/errors/CustomErrors';
import type { Permission } from '../database/models';
// La constante vive en users pero no importa nada — es pura, sin riesgo de
// dependencia circular (ver nota en permission.repository.ts).
import { ASSIGNABLE_PERMISSION_KEYS } from '../constants/assignablePermissions';

export interface ListPermissionsQuery {
    search?: string;
    module?: string;
    group?: string;
    page?: number;
    limit?: number;
}

/**
 * Catálogo de permisos en un solo endpoint con paginación dinámica: si el query
 * trae page/limit pagina; si no, trae todo (misma forma de respuesta, con
 * pagination de una sola página). `search`/`module`/`group` filtran en ambos
 * casos (se pueden combinar). `usage` sale de countPermissionUsageInRoutes,
 * memoizado una sola vez por proceso. `referencesCount` se calcula siempre en
 * vivo (nunca cacheado).
 */
export const listAll = async (query: ListPermissionsQuery) => {
    const search = query.search?.trim();
    const module = query.module?.trim() || undefined;
    const group = query.group?.trim() || undefined;
    const usage = countPermissionUsageInRoutes();
    const paginate = query.page !== undefined || query.limit !== undefined;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const pagination = paginate ? { page, limit } : undefined;

    const fetchAll = search
        ? () => PermissionRepository.search(search, module, group, pagination)
        : () => PermissionRepository.findAll(pagination, module, group);
    const { rows, count } = await cacheUtility.withCache(
        'system:permissions',
        paginate ? { page, limit, search, module, group } : { all: true, search, module, group },
        fetchAll
    );
    const referencesCount = await PermissionRepository.countEffectiveUsersByKeys(rows.map((row) => row.key));
    return { rows, count, usage, referencesCount, paginated: paginate as boolean, page, limit };
};

// Módulos y grupos distintos del catálogo, en una sola llamada — pueblan los dos filtros
// (módulo/grupo) del frontend con un solo request.
export const listModules = async (): Promise<{ modules: string[]; groups: string[] }> => {
    return cacheUtility.withCache('system:permissions:modules', {}, async () => {
        const [modules, groups] = await Promise.all([
            PermissionRepository.findDistinctModules(),
            PermissionRepository.findDistinctGroups(),
        ]);
        return { modules, groups };
    });
};

// Servida dinámica para pickers: system ve todo; el resto solo lo repartible
// (ASSIGNABLE_PERMISSION_KEYS). Sin paginar — los pickers tildan sobre el set completo.
export const listAssignable = async (isSystem: boolean) => {
    return cacheUtility.withCache('system:permissions:assignable', { isSystem }, () =>
        PermissionRepository.findAllOrdered(isSystem ? undefined : [...ASSIGNABLE_PERMISSION_KEYS])
    );
};

// ── Crea un permiso nuevo — bloqueado si ya existe uno con la misma key ───
export const create = async (data: InferCreationAttributes<Permission>) => {
    const existing = await PermissionRepository.findByKey(data.key);
    if (existing) throw new ConflictError(`Ya existe un permiso con la key "${data.key}"`);

    const created = await PermissionRepository.create(data);
    await cacheUtility.delByPattern('system:permissions:*');
    return created;
};

// ── Actualiza un permiso existente — bloqueado si la key ya pertenece a otro permiso ───
export const update = async (id: number, data: Partial<InferAttributes<Permission>>) => {
    const permission = await PermissionRepository.findById(id);
    if (!permission) throw new NotFoundError('Permiso no encontrado');

    if (data.key) {
        const existing = await PermissionRepository.findByKey(data.key);
        // permission_id es BIGINT — Sequelize lo devuelve como string, hay que castear antes de comparar contra el number del route param.
        if (existing && Number(existing.permission_id) !== id) {
            throw new ConflictError(`Ya existe un permiso con la key "${data.key}"`);
        }
    }

    const updated = await PermissionRepository.update(permission, data);
    await cacheUtility.delByPattern('system:permissions:*');
    return updated;
};

// ── Elimina un permiso — bloqueado si todavía está en uso (menú o permisos directos de usuario) ───
export const remove = async (id: number) => {
    const permission = await PermissionRepository.findById(id);
    if (!permission) throw new NotFoundError('Permiso no encontrado');

    const usage = await PermissionRepository.countUsageByKey(permission.key);
    if (usage > 0) {
        throw new ConflictError('No se puede eliminar un permiso que todavía está en uso');
    }

    await PermissionRepository.remove(permission);
    await cacheUtility.delByPattern('system:permissions:*');
};
