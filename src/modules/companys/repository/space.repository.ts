import type { CreationAttributes } from 'sequelize';
import { Space } from '../database/models';

export const create = async (data: CreationAttributes<Space>) => {
    return Space.create(data);
};

// Espacios de una sucursal — con su tipo de deporte para las cards.
export const findBySucursalId = async (sucursalId: number) => {
    return Space.findAll({
        where: { sucursal_id: sucursalId },
        include: [{ association: 'sportType', attributes: ['name'] }],
        order: [['created_at', 'DESC']],
    });
};

// Cuántos espacios tiene una sucursal — usado por planLimits para validar
// maxSpaces del plan antes de registrar uno nuevo.
export const countBySucursalId = async (sucursalId: number): Promise<number> => {
    return Space.count({ where: { sucursal_id: sucursalId } });
};

// Cuántos espacios hay en un conjunto de sucursales — para el medidor de uso
// del plan (getPlanUsage cuenta raíz + sucursales del grupo).
export const countBySucursalIds = async (sucursalIds: number[]): Promise<number> => {
    if (sucursalIds.length === 0) return 0;
    return Space.count({ where: { sucursal_id: sucursalIds } });
};
