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
 * Empresa principal por `tenant_id` (UUID) — se usa como identificador público en vez del
 * `company_id` secuencial, para no exponer el id real ni el orden de alta en la URL del
 * frontend. Trae país, dueño, el ubigeo con su cadena de padres completa (distrito → provincia
 * → departamento, para poder mostrarlo formateado) y sus sucursales (`subsidiaries`, con su
 * propio ubigeo también con la cadena de padres — lo que hace falta para la card de la grilla
 * de sucursales, no el detalle completo de edición, eso lo trae sucursal.service.ts aparte).
 */
export const findByTenantId = async (tenantId: string) => {
    return Company.findOne({
        where: { tenant_id: tenantId, parent_company_id: null },
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
                attributes: ['company_id', 'tenant_id', 'name', 'address'],
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
 * Sucursal por `tenant_id` (UUID propio, distinto del de su empresa padre — mismo criterio de
 * no exponer ids reales que `findByTenantId`). Trae país, el ubigeo con su cadena de padres
 * completa y la empresa padre (`parentCompany`, solo `tenant_id` — para armar el breadcrumb
 * "volver a la empresa" en el frontend sin otra consulta).
 */
export const findSucursalByTenantId = async (tenantId: string) => {
    return Company.findOne({
        where: { tenant_id: tenantId, parent_company_id: { [Op.ne]: null } },
        include: [
            { association: 'country' },
            {
                association: 'ubigeo',
                include: [{ association: 'parent', include: [{ association: 'parent' }] }],
            },
            { association: 'parentCompany', attributes: ['company_id', 'tenant_id'] },
        ],
    });
};

// Sucursales por tenant_id, con el tenant_id de su empresa padre.
export const findSucursalesByTenantIds = async (tenantIds: string[]) => {
    if (tenantIds.length === 0) return [];

    return Company.findAll({
        where: { tenant_id: { [Op.in]: tenantIds }, parent_company_id: { [Op.ne]: null } },
        attributes: ['company_id', 'tenant_id', 'name'],
        include: [{ association: 'parentCompany', attributes: ['company_id', 'tenant_id'] }],
    });
};

// Empresas o sucursales por id — solo su identificación (tenant_id y nombre).
export const findByIds = async (ids: number[]) => {
    if (ids.length === 0) return [];

    return Company.findAll({
        where: { company_id: { [Op.in]: ids } },
        attributes: ['company_id', 'tenant_id', 'name'],
    });
};
