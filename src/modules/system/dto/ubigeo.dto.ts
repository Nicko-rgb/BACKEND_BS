import Joi from 'joi';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';
import type { Ubigeo } from '../database/models';

// Recorre hoja → padre → abuelo y arma un mapa level -> nodo. Usa el campo
// `level` real de cada nodo (no la profundidad) para que funcione igual en
// países con menos de 3 niveles (ej. solo Estado/Municipio).
const buildLevelMap = (leaf: Ubigeo): Map<number, Ubigeo> => {
    const map = new Map<number, Ubigeo>();
    let node: Ubigeo | undefined = leaf;
    while (node) {
        map.set(node.level, node);
        node = node.parent;
    }
    return map;
};

export const toUbigeoDto = (ubigeo: Ubigeo, referencesCount = 0) => {
    const byLevel = buildLevelMap(ubigeo);

    return {
        id: ubigeo.ubigeo_id,
        code: ubigeo.code,
        name: ubigeo.name,
        countryId: ubigeo.country_id,
        countryName: ubigeo.country?.country ?? null,
        level1: byLevel.get(1)?.name ?? null,
        level2: byLevel.get(2)?.name ?? null,
        level3: byLevel.get(3)?.name ?? null,
        referencesCount,
        createdAt: ubigeo.created_at,
        updatedAt: ubigeo.updated_at,
    };
};

// Ubigeo es el único catálogo con búsqueda del lado del backend (los otros 6 son
// chicos y se buscan/filtran en el front) — este dataset sí puede ser grande.
export const ubigeoQuerySchema = paginationQuerySchema.keys({
    search: Joi.string().trim().max(100).allow('').optional(),
});

// Un nodo del árbol de ubigeo para selects en cascada — sin ancestros resueltos (el front ya los
// conoce por haber seleccionado cada nivel en orden). `hasChildren` indica si conviene pedir el
// siguiente nivel pasando este id como parentId, o si ya es una selección final.
export const toUbigeoNodeDto = (ubigeo: Ubigeo, hasChildren: boolean) => ({
    id: ubigeo.ubigeo_id,
    code: ubigeo.code,
    name: ubigeo.name,
    level: ubigeo.level,
    parentId: ubigeo.parent_id,
    countryId: ubigeo.country_id,
    hasChildren,
});

// Endpoint público en cascada: nivel 1 de un país (country_id) o hijos directos de un nodo
// (parent_id) — nunca ambos, nunca ninguno.
export const ubigeoChildrenQuerySchema = Joi.object({
    country_id: Joi.number().integer().positive()
        .messages({ 'number.base': 'country_id debe ser un número' }),
    parent_id: Joi.number().integer().positive()
        .messages({ 'number.base': 'parent_id debe ser un número' }),
}).xor('country_id', 'parent_id').messages({
    'object.xor': 'Debe indicar country_id (nivel 1) o parent_id (siguiente nivel), no ambos ni ninguno',
});

// PUT reemplaza solo los campos propios de la hoja — name/code. `level`/`parent_id`/`country_id`
// son estructurales (reordenan la jerarquía) y no se editan desde este formulario genérico.
export const updateUbigeoSchema = Joi.object({
    name: Joi.string().min(2).max(100).required()
        .messages({
            'string.base': 'El nombre es requerido',
            'string.empty': 'El nombre es requerido',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede superar 100 caracteres',
            'any.required': 'El nombre es requerido',
        }),

    code: Joi.string().min(1).max(20).required()
        .messages({
            'string.base': 'El código es requerido',
            'string.empty': 'El código es requerido',
            'string.max': 'El código no puede superar 20 caracteres',
            'any.required': 'El código es requerido',
        }),
});

// POST creación — un nodo nuevo bajo un padre (parent_id) o como nivel 1 de un país (parent_id null).
// El `level` no lo manda el front: el service lo calcula a partir del padre para no confiar en el cliente.
export const createUbigeoSchema = Joi.object({
    name: Joi.string().min(2).max(100).required()
        .messages({
            'string.base': 'El nombre es requerido',
            'string.empty': 'El nombre es requerido',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede superar 100 caracteres',
            'any.required': 'El nombre es requerido',
        }),

    code: Joi.string().min(1).max(20).required()
        .messages({
            'string.base': 'El código es requerido',
            'string.empty': 'El código es requerido',
            'string.max': 'El código no puede superar 20 caracteres',
            'any.required': 'El código es requerido',
        }),

    country_id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'El país es requerido',
            'any.required': 'El país es requerido',
        }),

    parent_id: Joi.number().integer().positive().allow(null).default(null)
        .messages({
            'number.base': 'El nivel padre debe ser un número',
        }),
});
