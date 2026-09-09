import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import * as SportCategoryRepository from '../repository/sportCategory.repository';
import cacheUtility from '../../../shared/utils/cacheUtility';
import { NotFoundError, ConflictError } from '../../../shared/errors/CustomErrors';
import type { PaginationQuery } from '../../../shared/types/pagination';
import type { SportCategory } from '../database/models';

// Todas las categorías deportivas (no tienen is_active), paginado — listado de administración
export const list = async (pagination: PaginationQuery) => {
    return cacheUtility.withCache('system:sport-categories', pagination, async () => {
        const { rows, count } = await SportCategoryRepository.findAll(pagination);
        const referencesCount = await SportCategoryRepository.countReferencesByIds(rows.map((row) => row.sport_category_id));
        return { rows, count, referencesCount };
    });
};

// Todas las categorías (no tienen is_active) — endpoint público, sin paginar, para selects/lógica de negocio
export const listActive = async () => {
    return cacheUtility.withCache('system:sport-categories:active', {}, () => SportCategoryRepository.findAllActive());
};

// Crea una categoría deportiva nueva — bloqueada si ya existe una con el mismo código
export const create = async (data: InferCreationAttributes<SportCategory>) => {
    const existing = await SportCategoryRepository.findByCode(data.code);
    if (existing) throw new ConflictError(`Ya existe una categoría deportiva con el código "${data.code}"`);

    const created = await SportCategoryRepository.create(data);
    await cacheUtility.delByPattern('system:sport-categories:*');
    return created;
};

// Actualiza una categoría deportiva existente — bloqueada si el código ya pertenece a otra. Limpia el cache de listados
export const update = async (id: number, data: Partial<InferAttributes<SportCategory>>) => {
    const sportCategory = await SportCategoryRepository.findById(id);
    if (!sportCategory) throw new NotFoundError('Categoría deportiva no encontrada');

    if (data.code) {
        const existing = await SportCategoryRepository.findByCode(data.code);
        // sport_category_id es BIGINT — Sequelize lo devuelve como string, hay que castear antes de comparar contra el number del route param.
        if (existing && Number(existing.sport_category_id) !== id) {
            throw new ConflictError(`Ya existe una categoría deportiva con el código "${data.code}"`);
        }
    }

    const updated = await SportCategoryRepository.update(sportCategory, data);
    await cacheUtility.delByPattern('system:sport-categories:*');
    return updated;
};

// Elimina una categoría deportiva — bloqueada si tiene espacios asociados
export const remove = async (id: number) => {
    const sportCategory = await SportCategoryRepository.findById(id);
    if (!sportCategory) throw new NotFoundError('Categoría deportiva no encontrada');

    const referencesCount = await SportCategoryRepository.countReferencesByIds([id]);
    if ((referencesCount[id] ?? 0) > 0) {
        throw new ConflictError('No se puede eliminar la categoría deportiva porque tiene espacios asociados');
    }

    await SportCategoryRepository.remove(sportCategory);
    await cacheUtility.delByPattern('system:sport-categories:*');
};
