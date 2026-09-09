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
}

/**
 * Todos los permisos del catálogo. Con `search`, busca por key o label en el backend y devuelve
 * todos los resultados sin paginar (catálogo chico, no hace falta recortar). Sin `search`, listado
 * paginado normal, con caché por página. `module` filtra el resultado en ambos casos. `usage` sale
 * de countPermissionUsageInRoutes, memoizado una sola vez por proceso. `referencesCount` se calcula
 * siempre en vivo (nunca cacheado) — cuenta usuarios con el permiso asignado directamente, dato que
 * cambia con más frecuencia que el catálogo mismo.
 */
export const listAll = async (query: ListPermissionsQuery) => {
    const search = query.search?.trim();
    const module = query.module?.trim() || undefined;
    const usage = countPermissionUsageInRoutes();

    if (search) {
        const rows = await PermissionRepository.search(search, module);
        const referencesCount = await PermissionRepository.countReferencesByKeys(rows.map((row) => row.key));
        return { rows, count: rows.length, usage, referencesCount };
    }

    const { rows, count } = await cacheUtility.withCache('system:permissions', { page: query.page, limit: query.limit, module }, async () => {
        return PermissionRepository.findAll(query, module);
    });
    const referencesCount = await PermissionRepository.countReferencesByKeys(rows.map((row) => row.key));
    return { rows, count, usage, referencesCount };
};

// Módulos distintos del catálogo — para poblar el filtro por módulo del frontend.
export const listModules = async (): Promise<string[]> => {
    return cacheUtility.withCache('system:permissions:modules', {}, () => PermissionRepository.findDistinctModules());
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
