/** Proyección mínima de los registros usados para construir el contexto del login. */
export interface ContextCountryRecord {
    country_id: number;
    country: string;
    iso_country: string;
    iso_currency: string;
    currency: string;
    currency_simbol: string;
}

export interface ContextCompanyRecord {
    company_id: number;
    parent_company_id: number | null;
    public_id: string;
    name: string;
    country?: ContextCountryRecord | null;
    parentCompany?: ContextCompanyRecord | null;
}

export interface ContextSpaceRecord {
    sucursal_id: number;
    public_id: string;
    name: string;
}

export interface CompanyContextSucursalNode {
    entity: ContextCompanyRecord;
    access: boolean;
    spaces: ContextSpaceRecord[];
}

export interface CompanyContextNode {
    entity: ContextCompanyRecord;
    access: boolean;
    isPrimary: boolean;
    sucursales: CompanyContextSucursalNode[];
}
