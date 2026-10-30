import { Op } from 'sequelize';
import type { Transaction } from 'sequelize';
import { AuthSession } from '../database/models/AuthSession';

export const create = async (jti: string, userId: number, expiresAt: Date, transaction: Transaction) => {
    return AuthSession.create({ jti, user_id: userId, expires_at: expiresAt, revoked_at: null }, { transaction });
};

export const findActive = async (jti: string, userId: number) => {
    return AuthSession.findOne({
        where: { jti, user_id: userId, revoked_at: null, expires_at: { [Op.gt]: new Date() } },
        attributes: ['jti'],
    });
};

export const revoke = async (jti: string, userId: number) => {
    return AuthSession.update({ revoked_at: new Date() }, { where: { jti, user_id: userId, revoked_at: null } });
};

export const revokeByUser = async (userId: number, transaction: Transaction) => {
    return AuthSession.update({ revoked_at: new Date() }, { where: { user_id: userId, revoked_at: null }, transaction });
};

export const purgeExpired = async () => {
    return AuthSession.destroy({ where: { expires_at: { [Op.lte]: new Date() } } });
};
