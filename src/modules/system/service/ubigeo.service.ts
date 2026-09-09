import type { InferAttributes } from 'sequelize';
import * as UbigeoRepository from '../repository/ubigeo.repository';
import cacheUtility from '../../../shared/utils/cacheUtility';
import { NotFoundError, ConflictError } from '../../../shared/errors/CustomErrors';
import type { Ubigeo } from '../database/models';

const MAX_LEVEL = 3; // 1=Departamento/Estado, 2=Provincia, 3=Distrito/Ciudad — tope del dominio, no hay nivel 4.

/**
 * Nivel 1 de un país o hijos directos de un nodo — endpoint público para selects en cascada.
 * Nunca trae el árbol completo (Ubigeo puede ser grande): el front pide un nivel a la vez.
 */
export const listChildren = async (params: { countryId?: number; parentId?: number }) => {
    return cacheUtility.withCache('system:ubigeo:children', params, async () => {
        const rows = await UbigeoRepository.findChildren(params);
        const idsWithChildren = await UbigeoRepository.findIdsWithChildren(rows.map((row) => row.ubigeo_id));
        return { rows, idsWithChildren };
    });
};

/**
 * Crea un nodo nuevo — nivel 1 de un país (sin `parent_id`) o hijo directo de otro nodo. El
 * `level` nunca lo manda el cliente: se calcula acá a partir del padre (padre.level + 1), y se
 * bloquea si el padre ya es nivel 3 (distrito) — no hay nivel 4 en el dominio.
 */
export const create = async (data: { name: string; code: string; country_id: number; parent_id: number | null }) => {
    let level = 1;

    if (data.parent_id !== null) {
        const parent = await UbigeoRepository.findById(data.parent_id);
        if (!parent) throw new NotFoundError('El nivel padre no existe');
        if (parent.level >= MAX_LEVEL) throw new ConflictError('No se pueden crear niveles más profundos que distrito (nivel 3)');
        // country_id es BIGINT — Sequelize lo devuelve como string, hay que castear antes de comparar contra el number de Joi.
        if (Number(parent.country_id) !== data.country_id) throw new ConflictError('El país no coincide con el país del nivel padre');
        level = parent.level + 1;
    }

    const existingCode = await UbigeoRepository.findByCode(data.code);
    if (existingCode) throw new ConflictError(`Ya existe un registro de ubigeo con el código "${data.code}"`);

    const created = await UbigeoRepository.create({ name: data.name, code: data.code, country_id: data.country_id, parent_id: data.parent_id, level });
    await cacheUtility.delByPattern('system:ubigeo:*');

    // Re-fetch con el include de padres — la instancia recién creada no trae `.parent` poblado, y el DTO lo necesita para armar level1/level2/level3.
    return (await UbigeoRepository.findById(created.ubigeo_id))!;
};

// Actualiza el nombre/código de un ubigeo existente — bloqueado si el código ya pertenece a otro. Limpia el cache de listados
export const update = async (id: number, data: Partial<InferAttributes<Ubigeo>>) => {
    const ubigeo = await UbigeoRepository.findById(id);
    if (!ubigeo) throw new NotFoundError('Ubigeo no encontrado');

    if (data.code) {
        const existing = await UbigeoRepository.findByCode(data.code);
        // ubigeo_id es BIGINT — mismo casteo que arriba.
        if (existing && Number(existing.ubigeo_id) !== id) {
            throw new ConflictError(`Ya existe un registro de ubigeo con el código "${data.code}"`);
        }
    }

    const updated = await UbigeoRepository.update(ubigeo, data);
    await cacheUtility.delByPattern('system:ubigeo:*');
    return updated;
};

// Elimina un ubigeo — bloqueado si tiene niveles geográficos hijos
export const remove = async (id: number) => {
    const ubigeo = await UbigeoRepository.findById(id);
    if (!ubigeo) throw new NotFoundError('Ubigeo no encontrado');

    const referencesCount = await UbigeoRepository.countReferencesByIds([id]);
    if ((referencesCount[id] ?? 0) > 0) {
        throw new ConflictError('No se puede eliminar un ubigeo con niveles geográficos hijos');
    }

    await UbigeoRepository.remove(ubigeo);
    await cacheUtility.delByPattern('system:ubigeo:*');
};
