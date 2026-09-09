import { Op } from 'sequelize';
import type { CreationAttributes, InferAttributes, Transaction } from 'sequelize';
import { Company } from '../database/models';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import type { PaginationQuery } from '../../../shared/types/pagination';

/**
 * Empresas principales (parent_company_id IS NULL — las sucursales no aparecen acá),
 * paginado, con su dueño (`userAssignments`: primer super_admin activo asignado, vía
 * `Company.hasMany(UserCompany)` — asociación ya wireada en companys/database/models,
 * no hace falta importar `users` acá). Con `search`, filtra por nombre o documento; con
 * `countryId`/`isEnabled`, filtra exacto por país y estado. Con `companyIds`, acota el
 * resultado a esos ids — usado para que un super_admin sin alcance global solo vea sus
 * propias empresas (ver company.service.ts). `distinct: true` evita que el JOIN con
 * userAssignments infle el `count`.
 */
export const findAllPrincipal = async (pagination: PaginationQuery, search?: string, companyIds?: number[], countryId?: number, isEnabled?: string) => {
    return Company.findAndCountAll({
        where: {
            parent_company_id: null,
            ...(companyIds ? { company_id: { [Op.in]: companyIds } } : {}),
            ...(countryId ? { country_id: countryId } : {}),
            ...(isEnabled ? { is_enabled: isEnabled } : {}),
            ...(search ? {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { document: { [Op.iLike]: `%${search}%` } },
                ],
            } : {}),
        },
        include: [
            { association: 'country' },
            {
                association: 'userAssignments',
                where: { role: 'super_admin', is_active: true },
                required: false,
                include: [{ association: 'user', include: [{ association: 'person', include: [{ association: 'country' }] }] }],
            },
        ],
        order: [['created_at', 'DESC']],
        distinct: true,
        ...toSequelizePagination(pagination),
    });
};

// Ids de las sucursales (parent_company_id) hijas de las empresas dadas — usado para expandir el scope de super_admin al armar el JWT del login.
export const findSucursalIdsByParentIds = async (parentIds: number[]): Promise<number[]> => {
    if (parentIds.length === 0) return [];

    const sucursales = await Company.findAll({
        where: { parent_company_id: { [Op.in]: parentIds } },
        attributes: ['company_id'],
    });

    return sucursales.map(s => s.company_id);
};

// Empresa padre por documento — usado para bloquear un alta con RUC ya registrado (las
// sucursales heredan el documento de su empresa padre, por eso el filtro por parent_company_id).
export const findByDocument = async (document: string) => {
    return Company.findOne({ where: { document, parent_company_id: null } });
};

// Crea la empresa (o sucursal) dentro de una transacción — usado por el alta de empresa.
export const create = async (data: CreationAttributes<Company>, transaction: Transaction) => {
    return Company.create(data, { transaction });
};

// Actualiza parcialmente la instancia ya cargada — usado por el webhook de MercadoPago para
// activar la empresa una vez confirmado el pago.
export const update = async (company: Company, data: Partial<InferAttributes<Company>>, transaction?: Transaction) => {
    return company.update(data, { transaction });
};

// Empresa por PK con el mismo include de dueño que el listado — usado para armar el DTO de
// respuesta justo después de crearla (findAllPrincipal pagina, esto no).
export const findByIdWithOwner = async (companyId: number) => {
    return Company.findByPk(companyId, {
        include: [
            { association: 'country' },
            {
                association: 'userAssignments',
                where: { role: 'super_admin', is_active: true },
                required: false,
                include: [{ association: 'user', include: [{ association: 'person', include: [{ association: 'country' }] }] }],
            },
        ],
    });
};
