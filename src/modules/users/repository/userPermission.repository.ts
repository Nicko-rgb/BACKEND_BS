import { Op } from 'sequelize';
import type { Transaction } from 'sequelize';
import sequelize from '../../../config/db';
import { UserPermission } from '../database/models';

// Keys de los permisos directos de un usuario.
export const findKeysByUserId = async (userId: number): Promise<string[]> => {
    const rows = await UserPermission.findAll({ where: { user_id: userId }, attributes: ['permission_key'] });
    return rows.map((row) => row.permission_key);
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

// Otorga un set de permisos a un usuario recién creado, dentro de una transacción — a diferencia
// de replaceForUser (edición, borra lo que sobra), acá no hay permisos previos que limpiar.
export const grantDefaults = async (userId: number, keys: string[], grantedBy: number, transaction: Transaction): Promise<void> => {
    if (keys.length === 0) return;

    await UserPermission.bulkCreate(
        keys.map((key) => ({ user_id: userId, permission_key: key, granted_by: grantedBy })),
        { transaction }
    );
};
