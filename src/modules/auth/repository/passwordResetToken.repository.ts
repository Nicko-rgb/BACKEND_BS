import { Op } from 'sequelize';
import type { CreationAttributes, Transaction } from 'sequelize';
import { PasswordResetToken } from '../database/models';

// Último token emitido para el usuario
export const findLatestByUser = async (userId: number) => {
    return PasswordResetToken.findOne({ where: { user_id: userId }, order: [['created_at', 'DESC']] });
};

// Marca como usados los tokens aún vigentes del usuario
export const invalidateActiveByUser = async (userId: number, transaction: Transaction) => {
    return PasswordResetToken.update({ used_at: new Date() }, { where: { user_id: userId, used_at: null }, transaction });
};

export const create = async (data: CreationAttributes<PasswordResetToken>, transaction: Transaction) => {
    return PasswordResetToken.create(data, { transaction });
};

// Token vigente y sin usar — para comprobar el enlace sin consumirlo
export const findActiveByHash = async (tokenHash: string) => {
    return PasswordResetToken.findOne({
        where: { token_hash: tokenHash, used_at: null, expires_at: { [Op.gt]: new Date() } },
    });
};

/**
 * Marca el token como usado solo si sigue vigente y sin usar, y devuelve la fila actualizada.
 * Al ser un único UPDATE, dos pedidos simultáneos con el mismo token: solo uno se lo lleva.
 */
export const consume = async (tokenHash: string, transaction: Transaction) => {
    const [, rows] = await PasswordResetToken.update(
        { used_at: new Date() },
        {
            where: { token_hash: tokenHash, used_at: null, expires_at: { [Op.gt]: new Date() } },
            returning: true,
            transaction,
        }
    );

    return rows[0] ?? null;
};
