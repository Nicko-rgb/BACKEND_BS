import { Op } from 'sequelize';
import sequelize from '../../../config/db';
import { UserPermission } from '../database/models';

// Keys de las excepciones de un usuario (ambos tipos juntos) — usado por el picker de
// ManageUserPermissions.tsx, que hoy solo escribe 'grant' (ver replaceForUser).
export const findKeysByUserId = async (userId: number): Promise<string[]> => {
    const rows = await UserPermission.findAll({ where: { user_id: userId }, attributes: ['permission_key'] });
    return rows.map((row) => row.permission_key);
};

export interface PermissionOverrides {
    grant: string[];
    revoke: string[];
}

// Excepciones de un usuario, separadas por tipo — usado por authorizationResolver para
// computar los permisos efectivos (permisos_del_rol ∪ grant − revoke).
export const findOverridesByUserId = async (userId: number): Promise<PermissionOverrides> => {
    const rows = await UserPermission.findAll({ where: { user_id: userId }, attributes: ['permission_key', 'type'] });
    const overrides: PermissionOverrides = { grant: [], revoke: [] };
    rows.forEach((row) => { overrides[row.type as 'grant' | 'revoke'].push(row.permission_key); });
    return overrides;
};

/**
 * Reemplaza el set completo de permisos directos de un usuario por `keys` — borra los que ya
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
