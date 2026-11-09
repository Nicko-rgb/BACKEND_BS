import { Op } from 'sequelize';
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

// Ventana operativa de varias sucursales — una sola consulta para el árbol público.
// Solo se leen las columnas que expone el contrato; el resto de la config no viaja.
export const findSchedulesBySucursalIds = async (sucursalIds: number[]) => {
    if (sucursalIds.length === 0) return [];

    return Configuration.findAll({
        where: { sucursal_id: { [Op.in]: sucursalIds } },
        attributes: ['sucursal_id', 'opening_time', 'closing_time'],
    });
};