import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import * as PermissionRepository from '../repository/permission.repository';
import { countPermissionUsageInRoutes } from '../utils/permissionUsage';
import cacheUtility from '../../../shared/utils/cacheUtility';
import { NotFoundError, ConflictError } from '../../../shared/errors/CustomErrors';
import type { PaginationQuery } from '../../../shared/types/pagination';
import type { Permission } from '../database/models';

export interface ListPermissionsQuery extends PaginationQuery {
    search?: string;
    module?: string;
    group?: string;
}

/**
 * Todos los permisos del catálogo. Con `search`, busca por key o label en el backend y devuelve
 * todos los resultados sin paginar (catálogo chico, no hace falta recortar). Sin `search`, listado
 * paginado normal, con caché por página. `module`/`group` filtran el resultado en ambos casos (se
 * pueden combinar). `usage` sale de countPermissionUsageInRoutes, memoizado una sola vez por
 * proceso. `referencesCount` se calcula siempre en vivo (nunca cacheado) — cuenta usuarios a los
 * que el permiso les llega EFECTIVAMENTE (vía su rol o vía una excepción directa, ver
 * countEffectiveUsersByKeys), no solo los que lo tienen como excepción — dato que cambia con más
 * frecuencia que el catálogo mismo.
 */
export const listAll = async (query: ListPermissionsQuery) => {
    const search = query.search?.trim();
    const module = query.module?.trim() || undefined;
    const group = query.group?.trim() || undefined;
    const usage = countPermissionUsageInRoutes();

    if (search) {
        const rows = await PermissionRepository.search(search, module, group);
        const referencesCount = await PermissionRepository.countEffectiveUsersByKeys(rows.map((row) => row.key));
        return { rows, count: rows.length, usage, referencesCount };
    }

    const { rows, count } = await cacheUtility.withCache('system:permissions', { page: query.page, limit: query.limit, module, group }, async () => {
        return PermissionRepository.findAll(query, module, group);
    });
    const referencesCount = await PermissionRepository.countEffectiveUsersByKeys(rows.map((row) => row.key));
    return { rows, count, usage, referencesCount };
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

// Catálogo completo, sin paginar — para pickers de checkboxes (ej. asignar permisos a un usuario).
export const listCatalog = async () => {
    return cacheUtility.withCache('system:permissions:catalog', {}, () => PermissionRepository.findAllOrdered());
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
