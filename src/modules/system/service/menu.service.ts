import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import * as MenuItemRepository from '../repository/menuItem.repository';
import * as RoleMenuItemRepository from '../repository/roleMenuItem.repository';
import * as RoleRepository from '../repository/role.repository';
import cacheUtility from '../../../shared/utils/cacheUtility';
import { NotFoundError, ConflictError, ValidationError } from '../../../shared/errors/CustomErrors';
import type { PaginationQuery } from '../../../shared/types/pagination';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { MenuItem } from '../database/models';

// Valida en bloque que role_ids exista de verdad antes de reemplazar la asignación — si no, el
// FK de role_menu_item.role_id revienta con un error crudo de Postgres en vez de un 400 claro.
const validateRoleIds = async (roleIds: number[]): Promise<void> => {
    if (roleIds.length === 0) return;

    const found = await RoleRepository.findByIds(roleIds);
    const foundIds = new Set(found.map((role) => Number(role.role_id)));
    const invalid = roleIds.filter((id) => !foundIds.has(id));
    if (invalid.length > 0) {
        throw new ValidationError(`Roles inexistentes: ${invalid.join(', ')}`);
    }
};

/**
 * Menú del usuario autenticado — filtra por dsg_bss_role_menu_item (asignación por rol,
 * gestionada desde el form de cada ítem en MenuManage.tsx), ya no por required_permission
 * contra user.permissions. scope_level=1 (system) ve todo sin excepción. `app` decide si se
 * sirve el menú del panel admin o del portal booking.
 */
export const getMenuForUser = async (user: AuthenticatedUser, app: 'admin' | 'booking') => {
    const items = await MenuItemRepository.findActiveByApp(app);

    if (user.scope_level === 1) {
        return items;
    }

    const allowedMenuIds = await RoleMenuItemRepository.findMenuIdsByRoleId(user.role_id);
    return items.filter((item) => allowedMenuIds.has(item.menu_id));
};

// ── Todos los ítems de menú (activos e inactivos, cualquier app), sin filtrar por permiso — solo para system.full_access ───
export const listAll = async (pagination: PaginationQuery) => {
    const { rows, count, childrenCount } = await cacheUtility.withCache('system:menu-items', pagination, async () => {
        const { rows, count } = await MenuItemRepository.findAll(pagination);
        const childrenCount = await MenuItemRepository.countChildrenByKeys(rows.map((row) => row.key));
        return { rows, count, childrenCount };
    });

    const roleIdsByMenuId = await RoleMenuItemRepository.findRoleIdsGroupedByMenuIds(rows.map((row) => row.menu_id));
    return { rows, count, childrenCount, roleIdsByMenuId };
};

interface MenuItemInput extends InferCreationAttributes<MenuItem> {
    role_ids: number[];
}

// ── Crea un ítem de menú nuevo — bloqueado si ya existe uno con la misma key, o si parent_key no existe ───
export const create = async (data: MenuItemInput) => {
    const { role_ids, ...itemData } = data;

    const existing = await MenuItemRepository.findByKey(itemData.key);
    if (existing) throw new ConflictError(`Ya existe un ítem de menú con la key "${itemData.key}"`);

    if (itemData.parent_key) {
        const parent = await MenuItemRepository.findByKey(itemData.parent_key);
        if (!parent) throw new NotFoundError('El ítem padre no existe');
    }

    await validateRoleIds(role_ids);

    const created = await MenuItemRepository.create(itemData);
    await RoleMenuItemRepository.replaceForMenuItem(created.menu_id, role_ids);

    await cacheUtility.delByPattern('system:menu-items:*');
    return { item: created, roleIds: role_ids };
};

interface MenuItemUpdateInput extends Partial<InferAttributes<MenuItem>> {
    role_ids: number[];
}

/**
 * Actualiza un ítem de menú existente — bloqueado si la key ya pertenece a otro ítem, si
 * parent_key apunta a un ítem inexistente, o si un ítem intenta ser su propio padre.
 */
export const update = async (id: number, data: MenuItemUpdateInput) => {
    const item = await MenuItemRepository.findById(id);
    if (!item) throw new NotFoundError('Ítem de menú no encontrado');

    const { role_ids, ...itemData } = data;

    if (itemData.key) {
        const existing = await MenuItemRepository.findByKey(itemData.key);
        // menu_id es BIGINT — Sequelize lo devuelve como string, hay que castear antes de comparar contra el number del route param.
        if (existing && Number(existing.menu_id) !== id) {
            throw new ConflictError(`Ya existe un ítem de menú con la key "${itemData.key}"`);
        }
    }

    if (itemData.parent_key) {
        if (itemData.parent_key === item.key) throw new ConflictError('Un ítem no puede ser su propio padre');
        const parent = await MenuItemRepository.findByKey(itemData.parent_key);
        if (!parent) throw new NotFoundError('El ítem padre no existe');
    }

    await validateRoleIds(role_ids);

    const updated = await MenuItemRepository.update(item, itemData);
    await RoleMenuItemRepository.replaceForMenuItem(id, role_ids);

    await cacheUtility.delByPattern('system:menu-items:*');
    return { item: updated, roleIds: role_ids };
};

// ── Elimina un ítem de menú — bloqueado si todavía tiene hijos. Sus asignaciones de rol se
// borran en cascada a nivel de BD (FK role_menu_item.menu_id ON DELETE CASCADE) ───
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
