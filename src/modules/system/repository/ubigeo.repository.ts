import { Op } from 'sequelize';
import type { InferAttributes, WhereOptions } from 'sequelize';
import { Ubigeo, Country } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import { countReferences } from '../../../shared/utils/checkReferences';
import type { PaginationQuery } from '../../../shared/types/pagination';

// Include compartido por findAll/findById — hoja + país + hasta 2 niveles de padres, para que el DTO arme la fila completa.
const LEAF_INCLUDE = [
    { model: Country, as: 'country' as const },
    { model: Ubigeo, as: 'parent' as const, include: [{ model: Ubigeo, as: 'parent' as const }] },
];

// Tablas que referencian a un ubigeo — autorreferencial (hijos directos).
const REFERENCE_CHECKS = [{ table: 'dsg_bss_ubigeo', column: 'parent_id' }];

// Excluye a cualquier ubigeo que sea padre de otro (deja solo hojas) y opcionalmente filtra por
// name/code — compartido por findAll (admin) y findAllActive (público).
const buildLeafWhere = async (search?: string): Promise<WhereOptions> => {
    const parentRows = await Ubigeo.findAll({
        attributes: ['parent_id'],
        where: { parent_id: { [Op.ne]: null } },
        group: ['parent_id'],
    });
    const parentIds = parentRows
        .map((row) => row.parent_id)
        .filter((id): id is number => id !== null);

    const baseWhere: WhereOptions = parentIds.length > 0 ? { ubigeo_id: { [Op.notIn]: parentIds } } : {};

    return search ? {
        ...baseWhere,
        [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { code: { [Op.iLike]: `%${search}%` } },
        ],
    } : baseWhere;
};

// Nivel 1 de un país (sin padre) o hijos directos de un ubigeo — para selects en cascada dinámicos
// (endpoint público): primero país → nivel 1, y si el nodo elegido tiene hijos, se pide el
// siguiente nivel pasando su id como parentId. Nunca trae el árbol completo de una.
export const findChildren = async (params: { countryId?: number; parentId?: number }) => {
    const where: WhereOptions = params.parentId !== undefined
        ? { parent_id: params.parentId }
        : { country_id: params.countryId, parent_id: { [Op.is]: null } };

    return Ubigeo.findAll({ where, order: [['name', 'ASC']] });
};

// Para un lote de ids, cuáles tienen al menos un hijo — así el front sabe si ese nodo es
// seleccionable como final o si conviene seguir cargando el siguiente nivel.
export const findIdsWithChildren = async (ids: number[]): Promise<number[]> => {
    if (ids.length === 0) return [];

    const rows = await Ubigeo.findAll({
        attributes: ['parent_id'],
        where: { parent_id: { [Op.in]: ids } },
        group: ['parent_id'],
    });

    return rows.map((row) => row.parent_id).filter((id): id is number => id !== null);
};

// Busca por PK con el mismo include de findAll — usado antes de update/delete para confirmar existencia y para que el DTO tenga país + padres resueltos.
export const findById = async (id: number) => {
    return Ubigeo.findByPk(id, { include: LEAF_INCLUDE });
};

// Busca por código — código único global (idx_ubigeo_code) — usado antes de crear/actualizar para bloquear duplicados.
export const findByCode = async (code: string) => {
    return Ubigeo.findOne({ where: { code } });
};

// Forma explícita en vez de InferCreationAttributes<Ubigeo>: al ser un modelo autorreferenciado
// (parent: NonAttribute<Ubigeo> dentro de la propia clase), TS no resuelve bien el brand
// CreationOptional de ubigeo_id/created_at/updated_at cuando el tipo se recalcula desde otro
// archivo — declararla a mano evita el falso error de "propiedades faltantes".
interface UbigeoCreationData {
    name: string;
    code: string;
    level: number;
    parent_id: number | null;
    country_id: number;
}

// Crea un nodo de ubigeo nuevo (nivel 1 de un país o hijo de otro nodo — el level ya viene calculado por el service).
export const create = async (data: UbigeoCreationData) => {
    return Ubigeo.create(data);
};

// Actualiza parcialmente la instancia ya cargada (name/code) y devuelve la misma instancia con los datos frescos.
export const update = async (ubigeo: Ubigeo, data: Partial<InferAttributes<Ubigeo>>) => {
    return ubigeo.update(data);
};

// Cuenta, por id, cuántos ubigeo hijos tiene cada uno — usado para mostrar el total en el
// listado y para bloquear el borrado si es mayor a 0.
export const countReferencesByIds = async (ids: number[]) => {
    return countReferences(REFERENCE_CHECKS, ids);
};

// Elimina el ubigeo ya cargado.
export const remove = async (ubigeo: Ubigeo) => {
    await ubigeo.destroy();
};
