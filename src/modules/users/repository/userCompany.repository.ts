import type { CreationAttributes, Transaction } from 'sequelize';
import { UserCompany } from '../database/models';

// Crea la asignación usuario-empresa dentro de una transacción — usado por el alta de empresa
// para dejar al dueño (super_admin) asignado a la empresa recién creada.
export const create = async (data: CreationAttributes<UserCompany>, transaction: Transaction) => {
    return UserCompany.create(data, { transaction });
};

// company_id de las asignaciones activas de un usuario — usado por authorizationResolver para
// recalcular company_ids en caliente (antes se calculaba una sola vez, en el login).
export const findActiveCompanyIdsByUserId = async (userId: number): Promise<number[]> => {
    const rows = await UserCompany.findAll({
        where: { user_id: userId, is_active: true },
        attributes: ['company_id'],
    });
    
    return rows.map((row) => Number(row.company_id));
};
