import { Op } from 'sequelize';
import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import { MenuItem } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import type { PaginationQuery } from '../../../shared/types/pagination';

// Ítems de menú activos para una app (admin/booking) — incluye los 'both'. Orden ya resuelto acá, no en el Service.
export const findActiveByApp = async (appAccess: 'admin' | 'booking') => {
    return MenuItem.findAll({
        where: {
            is_active: true,
            app_access: { [Op.in]: [appAccess, 'both'] },
        },
        order: [
            ['group_title', 'ASC'],
            ['sort_order', 'ASC'],
        ],
    });
};

// Todos los ítems (activos e inactivos, cualquier app_access), paginado — listado de administración,
// sin el filtro por permiso que sí aplica getMenuForUser.
export const findAll = async (pagination: PaginationQuery) => {
    return MenuItem.findAndCountAll({
        order: [
            ['group_title', 'ASC'],
            ['sort_order', 'ASC'],
        ],
        ...toSequelizePagination(pagination),
    });
};

// Busca por PK — usado antes de update/delete para confirmar existencia.
export const findById = async (id: number) => {
    return MenuItem.findByPk(id);
};

// Busca por key — key es único y además funciona como target de parent_key de otros ítems.
export const findByKey = async (key: string) => {
    return MenuItem.findOne({ where: { key } });
};

// Cuenta, por key, cuántos ítems tienen ese key como parent_key — autorreferencial por STRING, no
// encaja con countReferences (pensado para ids numéricos). Usado para bloquear el borrado de un
// ítem que todavía tiene hijos colgando de él.
export const countChildrenByKeys = async (keys: string[]): Promise<Record<string, number>> => {
    const counts: Record<string, number> = {};
    keys.forEach((key) => { counts[key] = 0; });
    if (keys.length === 0) return counts;

    const children = await MenuItem.findAll({
        attributes: ['parent_key'],
        where: { parent_key: { [Op.in]: keys } },
    });

    children.forEach((child) => {
        const parentKey = child.parent_key as string;
        counts[parentKey] = (counts[parentKey] ?? 0) + 1;
    });

    return counts;
};

// Crea un ítem de menú nuevo.
export const create = async (data: InferCreationAttributes<MenuItem>) => {
    return MenuItem.create(data);
};

// Actualiza parcialmente la instancia ya cargada y devuelve la misma instancia con los datos frescos.
export const update = async (item: MenuItem, data: Partial<InferAttributes<MenuItem>>) => {
    return item.update(data);
};

// Elimina el ítem de menú ya cargado.
export const remove = async (item: MenuItem) => {
    await item.destroy();
};
