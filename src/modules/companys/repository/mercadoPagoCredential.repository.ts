import type { CreationAttributes, InferAttributes, Transaction } from 'sequelize';
import { MercadoPagoCredential } from '../database/models';

// Credencial por sucursal_id (unique → una por sucursal).
export const findBySucursalId = async (sucursalId: number, transaction?: Transaction) => {
    return MercadoPagoCredential.findOne({ where: { sucursal_id: sucursalId }, transaction });
};

export const create = async (data: CreationAttributes<MercadoPagoCredential>, transaction?: Transaction) => {
    return MercadoPagoCredential.create(data, { transaction });
};

export const update = async (
    credential: MercadoPagoCredential,
    data: Partial<InferAttributes<MercadoPagoCredential>>,
    transaction?: Transaction,
) => {
    return credential.update(data, { transaction });
};

export const remove = async (credential: MercadoPagoCredential, transaction?: Transaction) => {
    return credential.destroy({ transaction });
};
