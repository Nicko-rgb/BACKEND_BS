import type { CreationAttributes, InferAttributes } from 'sequelize';
import { Space } from '../database/models';

export const create = async (data: CreationAttributes<Space>) => {
    return Space.create(data);
};

// Espacios de una sucursal — con su tipo de deporte para las cards.
export const findBySucursalId = async (sucursalId: number) => {
    return Space.findAll({
        where: { sucursal_id: sucursalId },
        include: [
            { association: 'sportType', attributes: ['name'] },
            { association: 'sportCategory', attributes: ['name'] },
            { association: 'surfaceType', attributes: ['name'] },
        ],
        order: [['created_at', 'DESC']],
    });
};

// Resuelve public_id (UUID) → space_id (PK BIGINT) — query ligera, solo 1 columna.
export const getSpaceIdByPublicId = async (publicId: string): Promise<number | null> => {
    const row = await Space.findOne({
        where: { public_id: publicId },
        attributes: ['space_id'],
        raw: true,
    });
    return row?.space_id ?? null;
};

// Espacio por PK (space_id) — con includes de catálogos. Usa índice clustered.
export const findById = async (spaceId: number) => {
    return Space.findByPk(spaceId, {
        include: [
            { association: 'sportType', attributes: ['name'] },
            { association: 'sportCategory', attributes: ['name'] },
            { association: 'surfaceType', attributes: ['name'] },
        ],
    });
};

// Actualiza parcialmente un espacio por PK — usado por updateSpace.
export const update = async (space: Space, data: Partial<InferAttributes<Space>>) => {
    return space.update(data);
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
