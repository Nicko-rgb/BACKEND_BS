import { Op, QueryTypes } from 'sequelize';
import type { CreationAttributes, Transaction } from 'sequelize';
import { UserCompany, UserSucursal } from '../database/models';
import sequelize from '../../../config/db';

/**
 * Acceso explícito por entidad. Dos tablas, un mismo concepto:
 *   - dsg_bss_user_company  → usuario ↔ empresa raíz.
 *   - dsg_bss_user_sucursal → usuario ↔ sucursal.
 * Son las dos fuentes de verdad del alcance (sin herencia por rol ni por tenant);
 * el dueño del tenant se declara en `dsg_bss_company.owner_user_id`, no acá.
 * Viven en un solo repositorio porque ambas responden a la misma operación:
 * asignar, revocar y resolver el conjunto de entidades al que llega un usuario.
 */

// ── Asignaciones ──────────────────────────────────────────────────────────────

// Asigna un usuario a una empresa raíz dentro de una transacción.
export const create = async (data: CreationAttributes<UserCompany>, transaction: Transaction) => {
    return UserCompany.create(data, { transaction });
};

// Asigna un usuario a una sucursal — usado por el alta de sucursal para el auto-grant del dueño.
export const createSucursal = async (data: CreationAttributes<UserSucursal>, transaction: Transaction) => {
    return UserSucursal.create(data, { transaction });
};

// Asignaciones usuario ↔ empresa raíz en lote (alta de un super_admin a su empresa).
export const bulkCreate = async (rows: CreationAttributes<UserCompany>[], transaction: Transaction) => {
    return UserCompany.bulkCreate(rows, { transaction });
};

// Asignaciones usuario ↔ sucursal en lote (alta/edición de administrador/empleado).
export const bulkCreateSucursales = async (rows: CreationAttributes<UserSucursal>[], transaction: Transaction) => {
    return UserSucursal.bulkCreate(rows, { transaction });
};

// Reemplaza las sucursales asignadas a un usuario. Con `scopeEntityIds`, solo toca las
// asignaciones dentro del alcance de quien edita — las de fuera quedan intactas.
export const replaceSucursales = async (
    userId: number,
    rows: CreationAttributes<UserSucursal>[],
    scopeEntityIds: number[] | undefined,
    transaction: Transaction,
) => {
    await UserSucursal.destroy({
        where: { user_id: userId, ...(scopeEntityIds ? { sucursal_id: { [Op.in]: scopeEntityIds } } : {}) },
        transaction,
    });
    if (rows.length > 0) await UserSucursal.bulkCreate(rows, { transaction });
};

// ── Lecturas ──────────────────────────────────────────────────────────────────

// Ids de entidad (empresa raíz o sucursal) con asignación activa de un usuario.
export const findActiveEntityIdsByUserId = async (userId: number, transaction?: Transaction): Promise<number[]> => {
    const [companies, sucursales] = await Promise.all([
        UserCompany.findAll({ where: { user_id: userId, is_active: true }, attributes: ['company_id'], transaction }),
        UserSucursal.findAll({ where: { user_id: userId, is_active: true }, attributes: ['sucursal_id'], transaction }),
    ]);

    // BIGINT — Sequelize lo devuelve como string, se normaliza a number.
    return [
        ...companies.map((row) => Number(row.company_id)),
        ...sucursales.map((row) => Number(row.sucursal_id)),
    ];
};

/**
 * ¿Tiene el usuario una asignación activa sobre esta entidad? Una sola lectura EXISTS:
 * `company_id` y `sucursal_id` comparten el PK de `dsg_bss_company`, así que el id se
 * busca en ambas tablas sin conocer el tipo. Chequeo estricto por entidad — sin herencia.
 */
export const hasEntityAssignment = async (userId: number, entityId: number, transaction?: Transaction): Promise<boolean> => {
    const [row] = await sequelize.query<{ has_access: boolean }>(`
        SELECT EXISTS(
            SELECT 1 FROM dsg_bss_user_company  WHERE user_id = :userId AND company_id  = :entityId AND is_active
            UNION ALL
            SELECT 1 FROM dsg_bss_user_sucursal WHERE user_id = :userId AND sucursal_id = :entityId AND is_active
        ) AS has_access`, { replacements: { userId, entityId }, type: QueryTypes.SELECT, transaction });

    return row?.has_access === true;
};

/**
 * Asignaciones activas de una empresa y sus sucursales, normalizadas a
 * `{ entityId, user }`: empresa desde `user_company`, sucursal desde
 * `user_sucursal`. Con el usuario y su país — dueño explícito incluido.
 */
export const findActiveByCompanyIds = async (companyIds: number[]) => {
    if (companyIds.length === 0) return [];

    const include = [{ association: 'user', include: [{ association: 'roleRef' }, { association: 'country' }] }];
    const [companies, sucursales] = await Promise.all([
        UserCompany.findAll({
            where: { company_id: { [Op.in]: companyIds }, is_active: true },
            include,
            order: [['created_at', 'ASC']],
        }),
        UserSucursal.findAll({
            where: { sucursal_id: { [Op.in]: companyIds }, is_active: true },
            include,
            order: [['created_at', 'ASC']],
        }),
    ]);

    return [
        ...companies.map((row) => ({ entityId: Number(row.company_id), user: row.user! })),
        ...sucursales.map((row) => ({ entityId: Number(row.sucursal_id), user: row.user! })),
    ];
};

// Usuarios distintos de la empresa y sus sucursales — unión de ambas tablas de acceso.
export const countActiveUsersByCompanyIds = async (companyIds: number[], transaction?: Transaction): Promise<number> => {
    if (companyIds.length === 0) return 0;
    const [row] = await sequelize.query<{ count: number }>(`
        SELECT COUNT(DISTINCT user_id)::integer AS count
        FROM (
            SELECT user_id FROM dsg_bss_user_company WHERE is_active AND company_id IN (:companyIds)
            UNION
            SELECT user_id FROM dsg_bss_user_sucursal WHERE is_active AND sucursal_id IN (:companyIds)
        ) assigned`, { replacements: { companyIds }, type: QueryTypes.SELECT, transaction });
    return row.count;
};
