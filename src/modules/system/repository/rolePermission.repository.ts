import { Op } from 'sequelize';
import sequelize from '../../../config/db';
import { RolePermission } from '../database/models';

// Keys de los permisos base de un rol.
export const findKeysByRoleId = async (roleId: number): Promise<string[]> => {
    const rows = await RolePermission.findAll({ where: { role_id: roleId }, attributes: ['permission_key'] });
    return rows.map((row) => row.permission_key);
};

// Keys de los permisos base de varios roles a la vez, agrupadas por role_id — usado por el
// resolver de autorización cuando hace falta resolver más de un rol en batch.
export const findKeysByRoleIds = async (roleIds: number[]): Promise<Record<number, string[]>> => {
    const result: Record<number, string[]> = {};
    roleIds.forEach((id) => { result[id] = []; });
    if (roleIds.length === 0) return result;

    const rows = await RolePermission.findAll({
        where: { role_id: { [Op.in]: roleIds } },
        attributes: ['role_id', 'permission_key'],
    });
    rows.forEach((row) => { result[row.role_id].push(row.permission_key); });
    return result;
};

/**
 * Reemplaza el set completo de permisos base de un rol por `keys` — mismo patrón que
 * userPermission.repository.ts::replaceForUser (borra los que sobran, crea los que faltan).
 * Transaccional: si el insert fallara, el delete se revierte también.
 */
export const replaceForRole = async (roleId: number, keys: string[]): Promise<void> => {
    await sequelize.transaction(async (transaction) => {
        if (keys.length === 0) {
            await RolePermission.destroy({ where: { role_id: roleId }, transaction });
            return;
        }

        await RolePermission.destroy({ where: { role_id: roleId, permission_key: { [Op.notIn]: keys } }, transaction });

        const existing = await RolePermission.findAll({ where: { role_id: roleId }, attributes: ['permission_key'], transaction });
        const existingKeys = new Set(existing.map((row) => row.permission_key));
        const toCreate = keys
            .filter((key) => !existingKeys.has(key))
            .map((key) => ({ role_id: roleId, permission_key: key }));

        if (toCreate.length > 0) {
            await RolePermission.bulkCreate(toCreate, { transaction });
        }
    });
};

// Cuenta, por key, a cuántos roles tiene asignado cada permiso — usado por
// permission.service.ts::countUsageByKey para bloquear el borrado de un permiso en uso.
export const countByKeys = async (keys: string[]): Promise<Record<string, number>> => {
    const counts: Record<string, number> = {};
    keys.forEach((key) => { counts[key] = 0; });
    if (keys.length === 0) return counts;

    const rows = await RolePermission.findAll({
        where: { permission_key: { [Op.in]: keys } },
        attributes: ['permission_key'],
    });
    rows.forEach((row) => { counts[row.permission_key] = (counts[row.permission_key] ?? 0) + 1; });
    return counts;
};
