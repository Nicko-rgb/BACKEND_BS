import { Op } from 'sequelize';
import { Company, Space } from '../database/models';
import type { ContextCompanyRecord, ContextSpaceRecord } from '../interfaces/companyContext.interface';

const COMPANY_ATTRIBUTES = ['company_id', 'parent_company_id', 'public_id', 'name', 'address', 'status'];
const COUNTRY_ATTRIBUTES = ['country_id', 'iso_currency', 'currency', 'currency_simbol'];

/** Una sola consulta para los espacios de las sucursales mostradas como contexto. */
export const findSpaces = async (sucursalIds: number[]): Promise<ContextSpaceRecord[]> => {
    return Space.findAll({
        where: { sucursal_id: { [Op.in]: sucursalIds } },
        attributes: ['sucursal_id', 'public_id', 'name'],
        order: [['name', 'ASC'], ['public_id', 'ASC']],
    });
};

/** Todas las empresas (matrices + sucursales) de un tenant — para empresas hermanas. */
export const findCompaniesByTenantId = async (tenantId: string): Promise<ContextCompanyRecord[]> => {
    return Company.findAll({
        where: { tenant_id: tenantId },
        attributes: COMPANY_ATTRIBUTES,
        include: [
            { association: 'country', attributes: COUNTRY_ATTRIBUTES },
            {
                association: 'parentCompany',
                attributes: COMPANY_ATTRIBUTES,
                include: [{ association: 'country', attributes: COUNTRY_ATTRIBUTES }],
            },
        ],
        order: [['name', 'ASC'], ['public_id', 'ASC']],
    });
};
