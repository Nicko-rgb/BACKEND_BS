import type { CreationAttributes, InferAttributes, Transaction } from 'sequelize';
import { Configuration } from '../database/models';

// Configuración por sucursal_id (unique → una por sucursal).
export const findBySucursalId = async (sucursalId: number, transaction?: Transaction) => {
    return Configuration.findOne({ where: { sucursal_id: sucursalId }, transaction });
};

export const create = async (data: CreationAttributes<Configuration>, transaction?: Transaction) => {
    return Configuration.create(data, { transaction });
};

export const update = async (configuration: Configuration, data: Partial<InferAttributes<Configuration>>, transaction?: Transaction) => {
    return configuration.update(data, { transaction });
};
