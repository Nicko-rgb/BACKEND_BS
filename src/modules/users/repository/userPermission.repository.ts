import { Op } from 'sequelize';
import type { Transaction } from 'sequelize';
import sequelize from '../../../config/db';
import { UserPermission } from '../database/models';
import { RolePermission } from '../../system/database/models';

// Set efectivo de permisos de un usuario — lo que hay acá ES lo que puede
// hacer (ver authorizationResolver). Lo precarga el picker de permisos.
export const findKeysByUserId = async (userId: number): Promise<string[]> => {
    const rows = await UserPermission.findAll({ where: { user_id: userId }, attributes: ['permission_key'] });
    return rows.map((row) => row.permission_key);
};

/**
 * Copia la plantilla de permisos del rol (dsg_bss_role_permission) al set
 * efectivo del usuario recién creado. El `grantedBy` es quien lo registra
 * (auditoría). Acepta la transacción del alta para que usuario + permisos
 * nazcan juntos o no nazcan.
 *
 * Después de esto el usuario vive independiente del rol: editar la plantilla
 * NO toca usuarios existentes.
 */
export const grantRoleDefaults = async (
    userId: number,
    roleId: number,
    grantedBy: number | null,
    transaction?: Transaction
): Promise<void> => {
    const template = await RolePermission.findAll({
        where: { role_id: roleId },
        attributes: ['permission_key'],
        transaction,
    });
    if (template.length === 0) return;

    const rows = template.map((row) => ({
        user_id: userId,
        permission_key: row.permission_key,
        granted_by: grantedBy,
    }));

    if (transaction) {
        await UserPermission.bulkCreate(rows, { transaction, ignoreDuplicates: true });
        return;
    }
    await sequelize.transaction(async (t) => {
        await UserPermission.bulkCreate(rows, { transaction: t, ignoreDuplicates: true });
    });
};

/**
 * Reemplaza el set completo de permisos de un usuario por `keys` — borra los que ya
 * no están, crea los que faltan, deja intactos los que se repiten (no pisa su `created_at`).
 * `grantedBy` es el usuario que hace el cambio (queda de auditoría en cada fila nueva).
 *
 * Todo en una transacción: si el insert fallara (ej. `grantedBy` inválido), el delete se
 * revierte también — nunca deja al usuario a mitad de camino sin sus permisos viejos ni los
 * nuevos.
 */
export const replaceForUser = async (userId: number, keys: string[], grantedBy: number): Promise<void> => {
    await sequelize.transaction(async (transaction) => {
        if (keys.length === 0) {
            await UserPermission.destroy({ where: { user_id: userId }, transaction });
            return;
        }

        await UserPermission.destroy({ where: { user_id: userId, permission_key: { [Op.notIn]: keys } }, transaction });

        const existing = await UserPermission.findAll({ where: { user_id: userId }, attributes: ['permission_key'], transaction });
        const existingKeys = new Set(existing.map((row) => row.permission_key));
        const toCreate = keys
            .filter((key) => !existingKeys.has(key))
            .map((key) => ({ user_id: userId, permission_key: key, granted_by: grantedBy }));

        if (toCreate.length > 0) {
            await UserPermission.bulkCreate(toCreate, { transaction });
        }
    });
};
