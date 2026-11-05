import { Op } from 'sequelize';
import { Company, Space } from '../database/models';
import type { ContextCompanyRecord, ContextSpaceRecord } from '../interfaces/companyContext.interface';

const COMPANY_ATTRIBUTES = ['company_id', 'parent_company_id', 'public_id', 'name'];
const COUNTRY_ATTRIBUTES = ['country_id', 'country', 'iso_country', 'iso_currency', 'currency', 'currency_simbol'];

/** Incluye las sucursales hermanas como contexto; su acceso se calcula por separado. */
export const findCompanies = async (companyIds: number[] | undefined): Promise<ContextCompanyRecord[]> => {
    return Company.findAll({
        where: companyIds === undefined ? {} : { [Op.or]: [
            { company_id: { [Op.in]: companyIds } },
            { parent_company_id: { [Op.in]: companyIds } },
        ] },
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

/** Una sola consulta para los espacios de las sucursales mostradas como contexto. */
export const findSpaces = async (sucursalIds: number[]): Promise<ContextSpaceRecord[]> => {
    return Space.findAll({
        where: { sucursal_id: { [Op.in]: sucursalIds } },
        attributes: ['sucursal_id', 'public_id', 'name'],
        order: [['name', 'ASC'], ['public_id', 'ASC']],
    });
};
