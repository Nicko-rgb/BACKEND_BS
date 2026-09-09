import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import { SurfaceType } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import { countReferences } from '../../../shared/utils/checkReferences';
import type { PaginationQuery } from '../../../shared/types/pagination';

// Tablas que referencian a un tipo de superficie.
const REFERENCE_CHECKS = [{ table: 'dsg_bss_space', column: 'surface_type_id' }];

// Todos los tipos de superficie, paginado — listado de administración (el modelo no tiene is_active).
export const findAll = async (pagination: PaginationQuery) => {
    return SurfaceType.findAndCountAll({
        order: [['name', 'ASC']],
        ...toSequelizePagination(pagination),
    });
};

// Todos los tipos de superficie, sin paginar — el modelo no tiene is_active, no hay "activos" que
// filtrar. Para selects/lógica de negocio en cualquier app (endpoint público).
export const findAllActive = async () => {
    return SurfaceType.findAll({
        order: [['name', 'ASC']],
    });
};

// Busca por PK — usado antes de update/delete para confirmar existencia.
export const findById = async (id: number) => {
    return SurfaceType.findByPk(id);
};

// Busca por código — usado antes de crear para bloquear duplicados con un mensaje claro.
export const findByCode = async (code: string) => {
    return SurfaceType.findOne({ where: { code } });
};

// Crea un tipo de superficie nuevo.
export const create = async (data: InferCreationAttributes<SurfaceType>) => {
    return SurfaceType.create(data);
};

// Actualiza parcialmente la instancia ya cargada y devuelve la misma instancia con los datos frescos.
export const update = async (surfaceType: SurfaceType, data: Partial<InferAttributes<SurfaceType>>) => {
    return surfaceType.update(data);
};

// Cuenta, por id, cuántos espacios usan cada tipo de superficie — usado para mostrar el total en
// el listado y para bloquear el borrado si es mayor a 0.
export const countReferencesByIds = async (ids: number[]) => {
    return countReferences(REFERENCE_CHECKS, ids);
};

// Elimina el tipo de superficie ya cargado.
export const remove = async (surfaceType: SurfaceType) => {
    await surfaceType.destroy();
};
