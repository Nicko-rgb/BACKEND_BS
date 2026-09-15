import { Op } from 'sequelize';
import type { CreationAttributes, Transaction } from 'sequelize';
import { UserCompany } from '../database/models';

// Crea la asignación usuario-empresa dentro de una transacción — usado por el alta de empresa
// para dejar al dueño (super_admin) asignado a la empresa recién creada.
export const create = async (data: CreationAttributes<UserCompany>, transaction: Transaction) => {
    return UserCompany.create(data, { transaction });
};

// Crea varias asignaciones usuario-empresa/sucursal dentro de una transacción.
export const bulkCreate = async (rows: CreationAttributes<UserCompany>[], transaction: Transaction) => {
    return UserCompany.bulkCreate(rows, { transaction });
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

// Asignaciones activas de un usuario, con su rol contextual.
export const findActiveByUserId = async (userId: number) => {
    return UserCompany.findAll({
        where: { user_id: userId, is_active: true },
        attributes: ['company_id', 'role'],
    });
};

// Borra las asignaciones de un usuario — con `companyIds`, solo las de esas empresas/sucursales.
export const destroyByUserId = async (userId: number, companyIds: number[] | undefined, transaction: Transaction) => {
    await UserCompany.destroy({
        where: {
            user_id: userId,
            ...(companyIds ? { company_id: { [Op.in]: companyIds } } : {}),
        },
        transaction,
    });
};

// Actualiza el rol contextual de todas las asignaciones de un usuario.
export const updateRoleByUserId = async (userId: number, role: string, transaction: Transaction) => {
    await UserCompany.update({ role }, { where: { user_id: userId }, transaction });
};
