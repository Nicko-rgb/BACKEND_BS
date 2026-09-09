import { Op, QueryTypes } from 'sequelize';
import type { InferAttributes, InferCreationAttributes } from 'sequelize';
import sequelize from '../../../config/db';
import { Permission, RolePermission } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import { countReferences } from '../../../shared/utils/checkReferences';
import type { PaginationQuery } from '../../../shared/types/pagination';

// user_permission vive en el módulo `users` — `system` no puede importar su modelo sin crear una
// dependencia circular (`users` ya importa `system`), así que el conteo cruza módulos solo con el
// nombre de tabla/columna real, vía countReferences.
const REFERENCE_CHECKS = [{ table: 'dsg_bss_user_permissions', column: 'permission_key' }];

// Todos los permisos del catálogo, paginado — ordenado por módulo y luego por key. `module`
// filtra por módulo real exacto, `group` por la agrupación funcional exacta — se pueden combinar.
export const findAll = async (pagination: PaginationQuery, module?: string, group?: string) => {
    return Permission.findAndCountAll({
        where: {
            ...(module ? { module } : {}),
            ...(group ? { group_name: group } : {}),
        },
        order: [
            ['module', 'ASC'],
            ['group_name', 'ASC'],
            ['key', 'ASC'],
        ],
        ...toSequelizePagination(pagination),
    });
};

// Busca por key o label (case-insensitive, sin paginar) — el catálogo completo de permisos es
// chico, no hace falta recortar resultados de búsqueda. `module`/`group` acotan la búsqueda.
export const search = async (term: string, module?: string, group?: string) => {
    const like = `%${term}%`;
    return Permission.findAll({
        where: {
            [Op.and]: [
                { [Op.or]: [{ key: { [Op.iLike]: like } }, { label: { [Op.iLike]: like } }] },
                ...(module ? [{ module }] : []),
                ...(group ? [{ group_name: group }] : []),
            ],
        },
        order: [
            ['module', 'ASC'],
            ['group_name', 'ASC'],
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

// Grupos distintos presentes en el catálogo — usado para poblar el filtro por grupo del frontend.
export const findDistinctGroups = async (): Promise<string[]> => {
    const rows = await Permission.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('group_name')), 'group_name']],
        order: [['group_name', 'ASC']],
        raw: true,
    }) as unknown as { group_name: string }[];
    return rows.map((row) => row.group_name);
};

// Busca por PK — usado antes de update/delete para confirmar existencia.
export const findById = async (id: number) => {
    return Permission.findByPk(id);
};

// Busca por key — key es único y además funciona como target lógico de permission_key
// (role_permission, user_permission).
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
            ['group_name', 'ASC'],
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

// Cuenta, por key, cuántas excepciones directas (dsg_bss_user_permissions, cualquier type) la
// referencian — una sola query agrupada para toda la lista de keys. NO es "a cuántos usuarios
// llega el permiso" (para eso ver countEffectiveUsersByKeys) — esto es solo para countUsageByKey,
// que bloquea el borrado de un permiso todavía en uso en cualquier tabla que lo referencie.
export const countReferencesByKeys = async (keys: string[]): Promise<Record<string, number>> => {
    return countReferences(REFERENCE_CHECKS, keys);
};

/**
 * Cuenta cuántas filas usan esta key — role_permission.permission_key (mismo módulo, vía el
 * modelo) + user_permission.permission_key (countReferencesByKeys, otro módulo). Usado para
 * bloquear el borrado de un permiso todavía en uso.
 */
export const countUsageByKey = async (key: string): Promise<number> => {
    const roleUsage = await RolePermission.count({ where: { permission_key: key } });
    const userPermissionUsage = await countReferencesByKeys([key]);

    return roleUsage + (userPermissionUsage[key] ?? 0);
};

/**
 * Cuenta, por key, a cuántos usuarios les llega EFECTIVAMENTE el permiso — no lo mismo que
 * countReferencesByKeys (que solo cuenta excepciones directas, por eso `system.full_access`
 * daba 0 ahí: nadie lo tiene como excepción, lo tiene el usuario `system` a través de su ROL).
 * Un usuario cuenta si:
 *   - su rol tiene esta key en dsg_bss_role_permission, y no tiene una excepción 'revoke' para
 *     ella (se la quitaron puntualmente), o
 *   - tiene una excepción 'grant' para ella (se la dieron puntualmente, sin importar su rol).
 * Cruza a `users` (dsg_bss_user, dsg_bss_user_permissions) por nombre de tabla en SQL crudo —
 * mismo motivo que countReferences: `system` no puede importar modelos de `users` sin crear una
 * dependencia circular. Una sola query (UNION, no UNION ALL — dedupe automático si un usuario
 * cae en las dos ramas) agrupada para toda la lista de keys.
 */
export const countEffectiveUsersByKeys = async (keys: string[]): Promise<Record<string, number>> => {
    const counts: Record<string, number> = {};
    keys.forEach((key) => { counts[key] = 0; });
    if (keys.length === 0) return counts;

    const rows = await sequelize.query<{ permission_key: string; count: number }>(
        `SELECT permission_key, COUNT(DISTINCT user_id)::int AS count FROM (
            SELECT rp.permission_key, u.user_id
            FROM dsg_bss_role_permission rp
            JOIN dsg_bss_user u ON u.role_id = rp.role_id
            WHERE rp.permission_key IN (:keys)
              AND NOT EXISTS (
                  SELECT 1 FROM dsg_bss_user_permissions up
                  WHERE up.user_id = u.user_id AND up.permission_key = rp.permission_key AND up.type = 'revoke'
              )
            UNION
            SELECT up.permission_key, up.user_id
            FROM dsg_bss_user_permissions up
            WHERE up.permission_key IN (:keys) AND up.type = 'grant'
        ) combined
        GROUP BY permission_key`,
        { replacements: { keys }, type: QueryTypes.SELECT }
    );

    rows.forEach((row) => { counts[row.permission_key] = row.count; });
    return counts;
};
