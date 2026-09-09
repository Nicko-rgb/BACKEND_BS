import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import * as MenuItemRepository from '../repository/menuItem.repository';
import cacheUtility from '../../../shared/utils/cacheUtility';
import { NotFoundError, ConflictError } from '../../../shared/errors/CustomErrors';
import type { PaginationQuery } from '../../../shared/types/pagination';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { MenuItem } from '../database/models';

/**
 * Menú del usuario autenticado — filtra por required_permission contra
 * user.permissions (system.full_access bypasea todo). `app` decide si se
 * sirve el menú del panel admin o del portal booking.
 */
export const getMenuForUser = async (user: AuthenticatedUser, app: 'admin' | 'booking') => {
    const items = await MenuItemRepository.findActiveByApp(app);

    if (user.permissions.includes('system.full_access')) {
        return items;
    }

    return items.filter(item => !item.required_permission || user.permissions.includes(item.required_permission));
};

// ── Todos los ítems de menú (activos e inactivos, cualquier app), sin filtrar por permiso — solo para system.full_access ───
export const listAll = async (pagination: PaginationQuery) => {
    return cacheUtility.withCache('system:menu-items', pagination, async () => {
        const { rows, count } = await MenuItemRepository.findAll(pagination);
        const childrenCount = await MenuItemRepository.countChildrenByKeys(rows.map((row) => row.key));
        return { rows, count, childrenCount };
    });
};

// ── Crea un ítem de menú nuevo — bloqueado si ya existe uno con la misma key, o si parent_key no existe ───
export const create = async (data: InferCreationAttributes<MenuItem>) => {
    const existing = await MenuItemRepository.findByKey(data.key);
    if (existing) throw new ConflictError(`Ya existe un ítem de menú con la key "${data.key}"`);

    if (data.parent_key) {
        const parent = await MenuItemRepository.findByKey(data.parent_key);
        if (!parent) throw new NotFoundError('El ítem padre no existe');
    }

    const created = await MenuItemRepository.create(data);
    await cacheUtility.delByPattern('system:menu-items:*');
    return created;
};

/**
 * Actualiza un ítem de menú existente — bloqueado si la key ya pertenece a otro ítem, si
 * parent_key apunta a un ítem inexistente, o si un ítem intenta ser su propio padre.
 */
export const update = async (id: number, data: Partial<InferAttributes<MenuItem>>) => {
    const item = await MenuItemRepository.findById(id);
    if (!item) throw new NotFoundError('Ítem de menú no encontrado');

    if (data.key) {
        const existing = await MenuItemRepository.findByKey(data.key);
        // menu_id es BIGINT — Sequelize lo devuelve como string, hay que castear antes de comparar contra el number del route param.
        if (existing && Number(existing.menu_id) !== id) {
            throw new ConflictError(`Ya existe un ítem de menú con la key "${data.key}"`);
        }
    }

    if (data.parent_key) {
        if (data.parent_key === item.key) throw new ConflictError('Un ítem no puede ser su propio padre');
        const parent = await MenuItemRepository.findByKey(data.parent_key);
        if (!parent) throw new NotFoundError('El ítem padre no existe');
    }

    const updated = await MenuItemRepository.update(item, data);
    await cacheUtility.delByPattern('system:menu-items:*');
    return updated;
};

// ── Elimina un ítem de menú — bloqueado si todavía tiene hijos ───
export const remove = async (id: number) => {
    const item = await MenuItemRepository.findById(id);
    if (!item) throw new NotFoundError('Ítem de menú no encontrado');

    const childrenCount = await MenuItemRepository.countChildrenByKeys([item.key]);
    if ((childrenCount[item.key] ?? 0) > 0) {
        throw new ConflictError('No se puede eliminar un ítem de menú que todavía tiene hijos');
    }

    await MenuItemRepository.remove(item);
    await cacheUtility.delByPattern('system:menu-items:*');
};
