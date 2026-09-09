import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import * as SportTypeRepository from '../repository/sportType.repository';
import cacheUtility from '../../../shared/utils/cacheUtility';
import { NotFoundError, ConflictError } from '../../../shared/errors/CustomErrors';
import type { PaginationQuery } from '../../../shared/types/pagination';
import type { SportType } from '../database/models';

// Todos los tipos de deporte (activos e inactivos), paginado — listado de administración
export const list = async (pagination: PaginationQuery) => {
    return cacheUtility.withCache('system:sport-types', pagination, async () => {
        const { rows, count } = await SportTypeRepository.findAll(pagination);
        const referencesCount = await SportTypeRepository.countReferencesByIds(rows.map((row) => row.sport_type_id));
        return { rows, count, referencesCount };
    });
};

// Solo tipos de deporte activos — endpoint público, sin paginar, para selects/lógica de negocio
export const listActive = async () => {
    return cacheUtility.withCache('system:sport-types:active', {}, () => SportTypeRepository.findAllActive());
};

// Crea un tipo de deporte nuevo — bloqueado si ya existe uno con el mismo código
export const create = async (data: InferCreationAttributes<SportType>) => {
    const existing = await SportTypeRepository.findByCode(data.code);
    if (existing) throw new ConflictError(`Ya existe un tipo de deporte con el código "${data.code}"`);

    const created = await SportTypeRepository.create(data);
    await cacheUtility.delByPattern('system:sport-types:*');
    return created;
};

// Actualiza un tipo de deporte existente — bloqueado si el código ya pertenece a otro. Limpia el cache de listados
export const update = async (id: number, data: Partial<InferAttributes<SportType>>) => {
    const sportType = await SportTypeRepository.findById(id);
    if (!sportType) throw new NotFoundError('Tipo de deporte no encontrado');

    if (data.code) {
        const existing = await SportTypeRepository.findByCode(data.code);
        // sport_type_id es BIGINT — Sequelize lo devuelve como string, hay que castear antes de comparar contra el number del route param.
        if (existing && Number(existing.sport_type_id) !== id) {
            throw new ConflictError(`Ya existe un tipo de deporte con el código "${data.code}"`);
        }
    }

    const updated = await SportTypeRepository.update(sportType, data);
    await cacheUtility.delByPattern('system:sport-types:*');
    return updated;
};

// Elimina un tipo de deporte — bloqueado si tiene espacios asociados
export const remove = async (id: number) => {
    const sportType = await SportTypeRepository.findById(id);
    if (!sportType) throw new NotFoundError('Tipo de deporte no encontrado');

    const referencesCount = await SportTypeRepository.countReferencesByIds([id]);
    if ((referencesCount[id] ?? 0) > 0) {
        throw new ConflictError('No se puede eliminar el tipo de deporte porque tiene espacios asociados');
    }

    await SportTypeRepository.remove(sportType);
    await cacheUtility.delByPattern('system:sport-types:*');
};
