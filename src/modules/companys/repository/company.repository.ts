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

// Ids de las sucursales (parent_company_id) hijas de las empresas dadas — usado por
// authorizationResolver para expandir el scope de super_admin en caliente en cada request.
export const findSucursalIdsByParentIds = async (parentIds: number[]): Promise<number[]> => {
    if (parentIds.length === 0) return [];

    const sucursales = await Company.findAll({
        where: { parent_company_id: { [Op.in]: parentIds } },
        attributes: ['company_id'],
    });

    // company_id es BIGINT — Sequelize lo devuelve como string, ver mismo comentario en
    // userCompany.repository.ts::findActiveCompanyIdsByUserId.
    return sucursales.map(s => Number(s.company_id));
};

// Empresa padre por documento — usado para bloquear un alta con RUC ya registrado (las
// sucursales heredan el documento de su empresa padre, por eso el filtro por parent_company_id).
export const findByDocument = async (document: string) => {
    return Company.findOne({ where: { document, parent_company_id: null } });
};

// Cuántas sucursales tiene ya una empresa — usado por sucursal.service.ts::register para
// validar contra `max_subsidiaries` del plan antes de crear una más (ver saas/service/planLimits.service.ts).
export const countSucursalesByParentId = async (parentCompanyId: number): Promise<number> => {
    return Company.count({ where: { parent_company_id: parentCompanyId } });
};

// Empresa principal por id — solo su id, para quien no necesita el detalle completo.
export const findRootById = async (companyId: number) => {
    return Company.findOne({ where: { company_id: companyId, parent_company_id: null }, attributes: ['company_id'] });
};

// Crea la empresa (o sucursal) — usado por el alta de empresa (dentro de una transacción, ver
// company.service.ts::register) y por el alta de sucursal (sin transacción, un solo insert).
export const create = async (data: CreationAttributes<Company>, transaction?: Transaction) => {
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

/**
 * Empresa principal por `public_id` (UUID único por fila, lo único expuesto en URLs —
 * nunca `company_id` ni `tenant_id`). Trae país, dueño, el ubigeo con su cadena de padres
 * completa (distrito → provincia → departamento) y sus sucursales (`subsidiaries`, con su
 * propio `public_id` también — lo que hace falta para la card de la grilla de sucursales).
 */
export const findByPublicId = async (publicId: string) => {
    return Company.findOne({
        where: { public_id: publicId, parent_company_id: null },
        include: [
            { association: 'country' },
            {
                association: 'ubigeo',
                include: [{ association: 'parent', include: [{ association: 'parent' }] }],
            },
            {
                association: 'userAssignments',
                where: { role: 'super_admin', is_active: true },
                required: false,
                include: [{ association: 'user', include: [{ association: 'person', include: [{ association: 'country' }] }] }],
            },
            {
                association: 'subsidiaries',
                attributes: ['company_id', 'public_id', 'name', 'address'],
                include: [
                    {
                        association: 'ubigeo',
                        include: [{ association: 'parent', include: [{ association: 'parent' }] }],
                    },
                ],
            },
        ],
    });
};

/**
 * Sucursal por `public_id` (UUID propio, distinto del de su empresa padre). Trae país,
 * el ubigeo con su cadena de padres completa y la empresa padre (`parentCompany`, solo
 * `public_id` — para armar el breadcrumb "volver a la empresa" sin otra consulta).
 */
export const findSucursalByPublicId = async (publicId: string) => {
    return Company.findOne({
        where: { public_id: publicId, parent_company_id: { [Op.ne]: null } },
        include: [
            { association: 'country' },
            {
                association: 'ubigeo',
                include: [{ association: 'parent', include: [{ association: 'parent' }] }],
            },
            { association: 'parentCompany', attributes: ['company_id', 'public_id'] },
        ],
    });
};

// Sucursales por public_id, con el public_id de su empresa padre.
export const findSucursalesByPublicIds = async (publicIds: string[]) => {
    if (publicIds.length === 0) return [];

    return Company.findAll({
        where: { public_id: { [Op.in]: publicIds }, parent_company_id: { [Op.ne]: null } },
        attributes: ['company_id', 'public_id', 'name', 'tenant_id'],
        include: [{ association: 'parentCompany', attributes: ['company_id', 'public_id', 'tenant_id'] }],
    });
};

// Empresa o sucursal por public_id — solo identificación pública (sin tenant ni id interno).
export const findPublicByIds = async (ids: number[]) => {
    if (ids.length === 0) return [];

    return Company.findAll({
        where: { company_id: { [Op.in]: ids } },
        attributes: ['company_id', 'public_id', 'name'],
    });
};

// Empresas o sucursales por id — SOLO uso interno (nunca exponer).
export const findByIds = async (ids: number[]) => {
    if (ids.length === 0) return [];

    return Company.findAll({
        where: { company_id: { [Op.in]: ids } },
        attributes: ['company_id', 'tenant_id', 'name'],
    });
};
