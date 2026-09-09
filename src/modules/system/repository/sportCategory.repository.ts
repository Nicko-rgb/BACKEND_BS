import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import { SportCategory } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import { countReferences } from '../../../shared/utils/checkReferences';
import type { PaginationQuery } from '../../../shared/types/pagination';

// Tablas que referencian a una categoría deportiva.
const REFERENCE_CHECKS = [{ table: 'dsg_bss_space', column: 'sport_category_id' }];

// Todas las categorías deportivas, paginado — listado de administración (el modelo no tiene is_active).
export const findAll = async (pagination: PaginationQuery) => {
    return SportCategory.findAndCountAll({
        order: [['name', 'ASC']],
        ...toSequelizePagination(pagination),
    });
};

// Todas las categorías, sin paginar — el modelo no tiene is_active, no hay "activas" que filtrar.
// Para selects/lógica de negocio en cualquier app (endpoint público).
export const findAllActive = async () => {
    return SportCategory.findAll({
        order: [['name', 'ASC']],
    });
};

// Busca por PK — usado antes de update/delete para confirmar existencia.
export const findById = async (id: number) => {
    return SportCategory.findByPk(id);
};

// Busca por código — usado antes de crear para bloquear duplicados con un mensaje claro.
export const findByCode = async (code: string) => {
    return SportCategory.findOne({ where: { code } });
};

// Crea una categoría deportiva nueva.
export const create = async (data: InferCreationAttributes<SportCategory>) => {
    return SportCategory.create(data);
};

// Actualiza parcialmente la instancia ya cargada y devuelve la misma instancia con los datos frescos.
export const update = async (sportCategory: SportCategory, data: Partial<InferAttributes<SportCategory>>) => {
    return sportCategory.update(data);
};

// Cuenta, por id, cuántos espacios usan cada categoría — usado para mostrar el total en el
// listado y para bloquear el borrado si es mayor a 0.
export const countReferencesByIds = async (ids: number[]) => {
    return countReferences(REFERENCE_CHECKS, ids);
};

// Elimina la categoría deportiva ya cargada.
export const remove = async (sportCategory: SportCategory) => {
    await sportCategory.destroy();
};
