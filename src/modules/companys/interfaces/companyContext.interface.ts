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

/** Formato de salida del contexto de empresa — única fuente de verdad para el front. */
export interface CompanyContextSucursalOut {
    publicId: string;
    name: string;
    openTime: string | null;
    closeTime: string | null;
    access: boolean;
    currency: {
        code: string;
        name: string;
        symbol: string;
    } | null;
    spaces: Array<{
        publicId: string;
        name: string;
        access: boolean;
    }>;
}

export interface CompanyContextCompanyOut {
    publicId: string;
    name: string;
    access: boolean;
    isPrimary: boolean;
    sucursales: CompanyContextSucursalOut[];
}

export interface CompanyContextPlanOut {
    name: string;
    code: string;
    status: string;
    isEffective: boolean;
    currentPeriodStart: Date | string | null;
    currentPeriodEnd: Date | string | null;
}

export interface CompanyContextTreeOut {
    companies: CompanyContextCompanyOut[];
    currentPlan: CompanyContextPlanOut | null;
    loadedAt: string;
    userPublicId: string;
}
