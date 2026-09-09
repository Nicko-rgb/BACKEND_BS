import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import * as SurfaceTypeRepository from '../repository/surfaceType.repository';
import cacheUtility from '../../../shared/utils/cacheUtility';
import { NotFoundError, ConflictError } from '../../../shared/errors/CustomErrors';
import type { PaginationQuery } from '../../../shared/types/pagination';
import type { SurfaceType } from '../database/models';

// Todos los tipos de superficie (no tienen is_active), paginado — listado de administración 
export const list = async (pagination: PaginationQuery) => {
    return cacheUtility.withCache('system:surface-types', pagination, async () => {
        const { rows, count } = await SurfaceTypeRepository.findAll(pagination);
        const referencesCount = await SurfaceTypeRepository.countReferencesByIds(rows.map((row) => row.surface_type_id));
        return { rows, count, referencesCount };
    });
};

// Todos los tipos de superficie (no tienen is_active) — endpoint público, sin paginar, para selects/lógica de negocio
export const listActive = async () => {
    return cacheUtility.withCache('system:surface-types:active', {}, () => SurfaceTypeRepository.findAllActive());
};

// Crea un tipo de superficie nuevo — bloqueado si ya existe uno con el mismo código
export const create = async (data: InferCreationAttributes<SurfaceType>) => {
    const existing = await SurfaceTypeRepository.findByCode(data.code);
    if (existing) throw new ConflictError(`Ya existe un tipo de superficie con el código "${data.code}"`);

    const created = await SurfaceTypeRepository.create(data);
    await cacheUtility.delByPattern('system:surface-types:*');
    return created;
};

// Actualiza un tipo de superficie existente — bloqueado si el código ya pertenece a otro. Limpia el cache de listados
export const update = async (id: number, data: Partial<InferAttributes<SurfaceType>>) => {
    const surfaceType = await SurfaceTypeRepository.findById(id);
    if (!surfaceType) throw new NotFoundError('Tipo de superficie no encontrado');

    if (data.code) {
        const existing = await SurfaceTypeRepository.findByCode(data.code);
        // surface_type_id es BIGINT — Sequelize lo devuelve como string, hay que castear antes de comparar contra el number del route param.
        if (existing && Number(existing.surface_type_id) !== id) {
            throw new ConflictError(`Ya existe un tipo de superficie con el código "${data.code}"`);
        }
    }

    const updated = await SurfaceTypeRepository.update(surfaceType, data);
    await cacheUtility.delByPattern('system:surface-types:*');
    return updated;
};

// ── Elimina un tipo de superficie — bloqueado si tiene espacios asociados
export const remove = async (id: number) => {
    const surfaceType = await SurfaceTypeRepository.findById(id);
    if (!surfaceType) throw new NotFoundError('Tipo de superficie no encontrado');

    const referencesCount = await SurfaceTypeRepository.countReferencesByIds([id]);
    if ((referencesCount[id] ?? 0) > 0) {
        throw new ConflictError('No se puede eliminar el tipo de superficie porque tiene espacios asociados');
    }

    await SurfaceTypeRepository.remove(surfaceType);
    await cacheUtility.delByPattern('system:surface-types:*');
};
