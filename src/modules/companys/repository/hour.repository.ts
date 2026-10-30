/**
 * Repositorio de horarios de operación (BusinessHour) — acceso a datos del
 * módulo companys. Nada de lógica de negocio acá: eso vive en hour.service.
 */
import type { CreationAttributes, InferAttributes, Transaction } from 'sequelize';
import { BusinessHour } from '../database/models';
import type { DayOfWeek } from '../interfaces/hour.interface';

// Bloques de horario del espacio — ordenados por hora de inicio; el service
// los agrupa por día (orden fijo lunes→domingo, el front lo espera así).
export const findBySpace = async (spaceId: number, transaction?: Transaction) => {
    return BusinessHour.findAll({
        where: { space_id: spaceId },
        order: [['start_time', 'ASC']],
        transaction,
    });
};

// Bloques de UN día específico del espacio — para el toggle por día.
export const findBySpaceAndDay = async (spaceId: number, dayOfWeek: DayOfWeek, transaction?: Transaction) => {
    return BusinessHour.findAll({
        where: { space_id: spaceId, day_of_week: dayOfWeek },
        transaction,
        order: [['start_time', 'ASC']],
    });
};

export const findById = async (hourId: number, transaction?: Transaction) => {
    return BusinessHour.findByPk(hourId, { transaction });
};

// Actualiza parcialmente un bloque — usado por toggleClosed.
export const update = async (hour: BusinessHour, data: Partial<InferAttributes<BusinessHour>>, transaction?: Transaction) => {
    return hour.update(data, { transaction });
};

/**
 * Habilita/deshabilita TODOS los bloques de un día en una sola sentencia
 */
export const updateClosedByDay = async (
    spaceId: number,
    dayOfWeek: DayOfWeek,
    isClosed: boolean,
    userUpdate: number,
    transaction: Transaction,
) => {
    await BusinessHour.update(
        { is_closed: isClosed, user_update: userUpdate },
        { where: { space_id: spaceId, day_of_week: dayOfWeek }, transaction },
    );

    return findBySpaceAndDay(spaceId, dayOfWeek, transaction);
};

/**
 * Reemplaza la semana completa del espacio
 */
export const replaceBySpace = async (spaceId: number, rows: CreationAttributes<BusinessHour>[], transaction: Transaction) => {
    await BusinessHour.destroy({ where: { space_id: spaceId }, transaction });

    if (rows.length > 0) {
        await BusinessHour.bulkCreate(rows, { transaction });
    }

    return findBySpace(spaceId, transaction);
};
