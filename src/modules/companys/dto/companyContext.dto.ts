import type { CompanyContextNode, ContextCompanyRecord } from '../interfaces/companyContext.interface';

const toEntity = (entity: ContextCompanyRecord, access: boolean) => ({
    publicId: entity.public_id,
    name: entity.name,
    access,
    country: entity.country ? {
        id: Number(entity.country.country_id),
        name: entity.country.country,
        isoCode: entity.country.iso_country,
    } : null,
});

/** Solo identificación pública y catálogos. No expone PKs de entidades ni tenant_id. */
export const toCompanyContextDto = (companies: CompanyContextNode[]) => ({
    companies: companies.map((company) => ({
        ...toEntity(company.entity, company.access),
        isPrimary: company.isPrimary,
        sucursales: company.sucursales.map((sucursal) => ({
            ...toEntity(sucursal.entity, sucursal.access),
            currency: sucursal.entity.country ? {
                code: sucursal.entity.country.iso_currency,
                name: sucursal.entity.country.currency,
                symbol: sucursal.entity.country.currency_simbol,
            } : null,
            spaces: sucursal.spaces.map((space) => ({
                publicId: space.public_id,
                name: space.name,
                access: sucursal.access,
            })),
        })),
    })),
});
