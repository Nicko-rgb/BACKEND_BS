import { Op } from 'sequelize';
import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import sequelize from '../../../config/db';
import { Permission, MenuItem } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import { countReferences } from '../../../shared/utils/checkReferences';
import type { PaginationQuery } from '../../../shared/types/pagination';

// user_permission vive en el módulo `users` — `system` no puede importar su modelo sin crear una
// dependencia circular (`users` ya importa `system`), así que el conteo cruza módulos solo con el
// nombre de tabla/columna real, vía countReferences.
const REFERENCE_CHECKS = [{ table: 'dsg_bss_user_permissions', column: 'permission_key' }];

// Todos los permisos del catálogo, paginado — ordenado por módulo y luego por key. Con `module`, filtra por ese módulo exacto.
export const findAll = async (pagination: PaginationQuery, module?: string) => {
    return Permission.findAndCountAll({
        where: module ? { module } : undefined,
        order: [
            ['module', 'ASC'],
            ['key', 'ASC'],
        ],
        ...toSequelizePagination(pagination),
    });
};

// Busca por key o label (case-insensitive, sin paginar) — el catálogo completo de permisos es
// chico, no hace falta recortar resultados de búsqueda. Con `module`, acota la búsqueda a ese módulo.
export const search = async (term: string, module?: string) => {
    const like = `%${term}%`;
    return Permission.findAll({
        where: {
            [Op.and]: [
                { [Op.or]: [{ key: { [Op.iLike]: like } }, { label: { [Op.iLike]: like } }] },
                ...(module ? [{ module }] : []),
            ],
        },
        order: [
            ['module', 'ASC'],
            ['key', 'ASC'],
        ],
    });
};

// Módulos distintos presentes en el catálogo — usado para poblar el filtro por módulo del frontend.
export const findDistinctModules = async (): Promise<string[]> => {
    const rows = await Permission.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('module')), 'module']],
        order: [['module', 'ASC']],
        raw: true,
    }) as unknown as { module: string }[];
    return rows.map((row) => row.module);
};

// Busca por PK — usado antes de update/delete para confirmar existencia.
export const findById = async (id: number) => {
    return Permission.findByPk(id);
};

// Busca por key — key es único y además funciona como target lógico de required_permission
// (menu_item) y permission_key (user_permission).
export const findByKey = async (key: string) => {
    return Permission.findOne({ where: { key } });
};

// Busca varias por key a la vez — usado para validar, en bloque, que un conjunto de keys
// exista en el catálogo antes de asignarlas como permisos directos de un usuario.
export const findByKeys = async (keys: string[]) => {
    if (keys.length === 0) return [];
    return Permission.findAll({ where: { key: { [Op.in]: keys } } });
};

// Catálogo completo, sin paginar — para pickers de checkboxes (ej. asignar permisos a un usuario).
export const findAllOrdered = async () => {
    return Permission.findAll({
        order: [
            ['module', 'ASC'],
            ['key', 'ASC'],
        ],
    });
};

// Crea un permiso nuevo.
export const create = async (data: InferCreationAttributes<Permission>) => {
    return Permission.create(data);
};

// Actualiza parcialmente la instancia ya cargada y devuelve la misma instancia con los datos frescos.
export const update = async (permission: Permission, data: Partial<InferAttributes<Permission>>) => {
    return permission.update(data);
};

// Elimina el permiso ya cargado.
export const remove = async (permission: Permission) => {
    await permission.destroy();
};

// Cuenta, por key, a cuántos usuarios tiene asignado cada permiso directamente (user_permission.permission_key)
// — una sola query agrupada para toda la lista de keys. Usado para mostrar el total en el listado.
export const countReferencesByKeys = async (keys: string[]): Promise<Record<string, number>> => {
    return countReferences(REFERENCE_CHECKS, keys);
};

/**
 * Cuenta cuántas filas usan esta key — menu_item.required_permission (mismo módulo, vía el
 * modelo) + user_permission.permission_key (countReferencesByKeys). Usado para bloquear el
 * borrado de un permiso todavía en uso.
 */
export const countUsageByKey = async (key: string): Promise<number> => {
    const menuUsage = await MenuItem.count({ where: { required_permission: key } });
    const userPermissionUsage = await countReferencesByKeys([key]);

    return menuUsage + (userPermissionUsage[key] ?? 0);
};
