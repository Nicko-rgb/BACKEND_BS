import { Op } from 'sequelize';
import sequelize from '../../../config/db';
import { RoleMenuItem } from '../database/models';

// Ids de los ítems de menú visibles para un rol — usado por menu.service.ts::getMenuForUser.
export const findMenuIdsByRoleId = async (roleId: number): Promise<Set<number>> => {
    const rows = await RoleMenuItem.findAll({ where: { role_id: roleId }, attributes: ['menu_id'] });
    return new Set(rows.map((row) => row.menu_id));
};

// Ids de rol asignados, agrupados por menu_id — una sola query para toda una página del
// listado admin (evita N+1 al armar la columna "Roles" de MenuManage.tsx).
export const findRoleIdsGroupedByMenuIds = async (menuIds: number[]): Promise<Record<number, number[]>> => {
    const result: Record<number, number[]> = {};
    menuIds.forEach((id) => { result[id] = []; });
    if (menuIds.length === 0) return result;

    const rows = await RoleMenuItem.findAll({
        where: { menu_id: { [Op.in]: menuIds } },
        attributes: ['menu_id', 'role_id'],
    });
    rows.forEach((row) => { result[row.menu_id].push(row.role_id); });
    return result;
};

/**
 * Reemplaza el set completo de roles asignados a un ítem de menú por `roleIds` — mismo patrón
 * que rolePermission.repository.ts::replaceForRole, pero keyed por menu_id en vez de role_id
 * (la asignación se gestiona desde el form del ítem de menú, no desde una pantalla de roles).
 */
export const replaceForMenuItem = async (menuId: number, roleIds: number[]): Promise<void> => {
    await sequelize.transaction(async (transaction) => {
        if (roleIds.length === 0) {
            await RoleMenuItem.destroy({ where: { menu_id: menuId }, transaction });
            return;
        }

        await RoleMenuItem.destroy({ where: { menu_id: menuId, role_id: { [Op.notIn]: roleIds } }, transaction });

        const existing = await RoleMenuItem.findAll({ where: { menu_id: menuId }, attributes: ['role_id'], transaction });
        const existingRoleIds = new Set(existing.map((row) => Number(row.role_id)));
        const toCreate = roleIds
            .filter((roleId) => !existingRoleIds.has(roleId))
            .map((roleId) => ({ role_id: roleId, menu_id: menuId }));

        if (toCreate.length > 0) {
            await RoleMenuItem.bulkCreate(toCreate, { transaction });
        }
    });
};
