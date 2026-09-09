import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import { SportType } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import { countReferences } from '../../../shared/utils/checkReferences';
import type { PaginationQuery } from '../../../shared/types/pagination';

// Tablas que referencian a un tipo de deporte.
const REFERENCE_CHECKS = [{ table: 'dsg_bss_space', column: 'sport_type_id' }];

// Todos los tipos de deporte (activos e inactivos), paginado — listado de administración.
export const findAll = async (pagination: PaginationQuery) => {
    return SportType.findAndCountAll({
        order: [['name', 'ASC']],
        ...toSequelizePagination(pagination),
    });
};

// Solo tipos de deporte activos, sin paginar — para selects/lógica de negocio en cualquier app (endpoint público).
export const findAllActive = async () => {
    return SportType.findAll({
        where: { is_active: true },
        order: [['name', 'ASC']],
    });
};

// Busca por PK — usado antes de update/delete para confirmar existencia.
export const findById = async (id: number) => {
    return SportType.findByPk(id);
};

// Busca por código — usado antes de crear para bloquear duplicados con un mensaje claro.
export const findByCode = async (code: string) => {
    return SportType.findOne({ where: { code } });
};

// Crea un tipo de deporte nuevo.
export const create = async (data: InferCreationAttributes<SportType>) => {
    return SportType.create(data);
};

// Actualiza parcialmente la instancia ya cargada y devuelve la misma instancia con los datos frescos.
export const update = async (sportType: SportType, data: Partial<InferAttributes<SportType>>) => {
    return sportType.update(data);
};

// Cuenta, por id, cuántos espacios usan cada tipo de deporte — usado para mostrar el total en el
// listado y para bloquear el borrado si es mayor a 0.
export const countReferencesByIds = async (ids: number[]) => {
    return countReferences(REFERENCE_CHECKS, ids);
};

// Elimina el tipo de deporte ya cargado.
export const remove = async (sportType: SportType) => {
    await sportType.destroy();
};
