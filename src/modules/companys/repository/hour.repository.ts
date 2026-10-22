/**
 * Repositorio de horarios de operación (BusinessHour) — acceso a datos del
 * módulo companys. Nada de lógica de negocio acá: eso vive en hour.service.
 */
import type { CreationAttributes, InferAttributes } from 'sequelize';
import { BusinessHour } from '../database/models';
import type { DayOfWeek } from '../interfaces/hour.interface';

export const create = async (data: CreationAttributes<BusinessHour>) => {
    return BusinessHour.create(data);
};

// Bloques de horario del espacio — ordenados por hora de inicio; el service
// los agrupa por día (orden fijo lunes→domingo, el front lo espera así).
export const findBySpace = async (spaceId: number) => {
    return BusinessHour.findAll({
        where: { space_id: spaceId },
        order: [['start_time', 'ASC']],
    });
};

// Bloques de UN día específico del espacio — para la validación de solapamiento.
export const findBySpaceAndDay = async (spaceId: number, dayOfWeek: DayOfWeek) => {
    return BusinessHour.findAll({
        where: { space_id: spaceId, day_of_week: dayOfWeek },
        order: [['start_time', 'ASC']],
    });
};

// Bloque por PK (hour_id) — el id interno se usa en URL porque la fila no
// expone datos sensibles.
export const findById = async (hourId: number) => {
    return BusinessHour.findByPk(hourId);
};

// Actualiza parcialmente un bloque — usado por updateHour y toggleClosed.
export const update = async (hour: BusinessHour, data: Partial<InferAttributes<BusinessHour>>) => {
    return hour.update(data);
};
