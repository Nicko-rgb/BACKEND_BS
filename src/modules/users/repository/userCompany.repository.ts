import { Op, QueryTypes } from 'sequelize';
import type { CreationAttributes, Transaction } from 'sequelize';
import { UserCompany } from '../database/models';
import sequelize from '../../../config/db';

// Crea la asignación usuario-empresa dentro de una transacción — usado por el alta de empresa
// para dejar al dueño (super_admin) asignado a la empresa recién creada.
export const create = async (data: CreationAttributes<UserCompany>, transaction: Transaction) => {
    return UserCompany.create(data, { transaction });
};

// Crea varias asignaciones usuario-empresa/sucursal dentro de una transacción.
export const bulkCreate = async (rows: CreationAttributes<UserCompany>[], transaction: Transaction) => {
    return UserCompany.bulkCreate(rows, { transaction });
};

// company_id de las asignaciones activas de un usuario — usado por authorizationResolver para
// recalcular company_ids en caliente (antes se calculaba una sola vez, en el login).
export const findActiveCompanyIdsByUserId = async (userId: number, transaction?: Transaction): Promise<number[]> => {
    const rows = await UserCompany.findAll({
        where: { user_id: userId, is_active: true },
        attributes: ['company_id'],
        transaction,
    });

    return rows.map((row) => Number(row.company_id));
};

/**
 * Asignaciones activas de una empresa y sus sucursales, con el usuario y su persona —
 * dueño explícito incluido: el detalle de empresa lo muestra también en la
 * lista para gestionar sus permisos desde ahí.
 */
export const findActiveByCompanyIds = async (companyIds: number[]) => {
    if (companyIds.length === 0) return [];

    return UserCompany.findAll({
        where: {
            company_id: { [Op.in]: companyIds },
            is_active: true,
        },
        include: [{ association: 'user', include: [{ association: 'roleRef' }, { association: 'person', include: [{ association: 'country' }] }] }],
        order: [['created_at', 'ASC']],
    });
};

// Usuarios distintos de la empresa y sus sucursales, incluyendo al dueño heredado.
export const countActiveUsersByCompanyIds = async (companyIds: number[], transaction?: Transaction): Promise<number> => {
    if (companyIds.length === 0) return 0;
    const [row] = await sequelize.query<{ count: number }>(`
        SELECT COUNT(DISTINCT uc.user_id)::integer AS count
        FROM dsg_bss_user_company uc
        WHERE uc.is_active AND (
            uc.company_id IN (:companyIds) OR
            (uc.is_owner AND uc.tenant_id IN (
                SELECT tenant_id FROM dsg_bss_company WHERE company_id IN (:companyIds)
            ))
        )`, { replacements: { companyIds }, type: QueryTypes.SELECT, transaction });
    return row.count;
};

// Asignaciones activas de un usuario y propiedad del grupo.
export const findActiveByUserId = async (userId: number, transaction?: Transaction) => {
    return UserCompany.findAll({
        where: { user_id: userId, is_active: true },
        attributes: ['company_id', 'tenant_id', 'is_owner'],
        transaction,
    });
};

// Borra las asignaciones de un usuario — con `companyIds`, solo las de esas empresas/sucursales.
export const destroyByUserId = async (userId: number, companyIds: number[] | undefined, transaction: Transaction) => {
    await UserCompany.destroy({
        where: {
            user_id: userId,
            is_owner: false,
            ...(companyIds ? { company_id: { [Op.in]: companyIds } } : {}),
        },
        transaction,
    });
};


export const findOwnerByTenantId = async (tenantId: string, transaction?: Transaction) => {
    return UserCompany.findOne({
        where: { tenant_id: tenantId, is_owner: true, is_active: true },
        include: [{ association: 'user', include: [{ association: 'roleRef' }, { association: 'person', include: [{ association: 'country' }] }] }],
        transaction,
    });
};

// Única expansión de alcance. Se consulta en cada request: nuevas hermanas y
// cambios de propiedad aplican sin depender de un árbol guardado en el JWT/cache.
export const findEffectiveCompanyIdsByUserId = async (userId: number, transaction?: Transaction): Promise<number[]> => {
    const rows = await sequelize.query<{ company_id: number }>(`
        WITH assignments AS (
            SELECT uc.company_id, uc.tenant_id, uc.is_owner
            FROM dsg_bss_user_company uc
            JOIN dsg_bss_company c ON c.company_id = uc.company_id AND c.tenant_id = uc.tenant_id
            WHERE uc.user_id = :userId AND uc.is_active
        ), authorized AS (
            SELECT company_id FROM assignments
            UNION
            SELECT covered.company_id
            FROM assignments a
            JOIN dsg_bss_saas_subscription_company primary_link
              ON primary_link.company_id = a.company_id AND primary_link.is_primary
            JOIN dsg_bss_saas_subscription_company member
              ON member.subscription_id = primary_link.subscription_id
            JOIN dsg_bss_company covered ON covered.company_id = member.company_id
              AND covered.tenant_id = a.tenant_id AND covered.parent_company_id IS NULL
            WHERE a.is_owner
        )
        SELECT company_id FROM authorized
        UNION
        SELECT child.company_id FROM dsg_bss_company child
        JOIN dsg_bss_company parent ON parent.company_id = child.parent_company_id
          AND parent.tenant_id = child.tenant_id AND parent.parent_company_id IS NULL
        JOIN authorized a ON a.company_id = parent.company_id
    `, { replacements: { userId }, type: QueryTypes.SELECT, transaction });
    return rows.map((row) => Number(row.company_id));
};
