import type { CreationAttributes, InferAttributes, Transaction } from 'sequelize';
import { PaymentAccount, Company } from '../database/models';

export const listBySucursal = (sucursalId: number) => PaymentAccount.findAll({
    include: [{ association: 'qr', required: false }],
    where: { sucursal_id: sucursalId }, order: [['payment_type_id', 'ASC']],
});
export const findBySucursalAndType = (sucursalId: number, typeId: number, transaction?: Transaction) =>
    PaymentAccount.findOne({ include: [{ association: 'qr', required: false }], where: { sucursal_id: sucursalId, payment_type_id: typeId }, transaction });

// Serializa altas, ediciones y bajas incluso cuando todavía no existe la cuenta.
export const lockSucursal = (sucursalId: number, transaction: Transaction) =>
    Company.findByPk(sucursalId, { transaction, lock: transaction.LOCK.UPDATE });
export const create = (data: CreationAttributes<PaymentAccount>, transaction: Transaction) =>
    PaymentAccount.create(data, { transaction });
export const update = (account: PaymentAccount, data: Partial<InferAttributes<PaymentAccount>>, transaction: Transaction) =>
    account.update(data, { transaction });
export const remove = (account: PaymentAccount, transaction: Transaction) => account.destroy({ transaction });
