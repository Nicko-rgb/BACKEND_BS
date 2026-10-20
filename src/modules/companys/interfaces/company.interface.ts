import type { DocumentType } from '../../users/interfaces/user.interface';
import type { PaginationQuery } from '../../../shared/types/pagination';

/**
 * Contratos de payload de la empresa — capa de entrada del service.
 *
 * Espeja `company.schema.ts`. La alta es un wizard: un objeto por paso del
 * frontend (empresa, dueño, plan).
 */

// Filtros del listado de empresas principales.
export interface ListCompaniesQuery extends PaginationQuery {
    search?: string;
    countryId?: number;
    isEnabled?: string;
}

// Payload de autoedición de la propia empresa — todo opcional, incluye `document`
// (RUC) para poder corregir un dato mal cargado al registrar.
export interface UpdateCompanyInput {
    name?: string;
    document?: string;
    country_id?: number;
    ubigeo_id?: number;
    address?: string;
    phone_cell?: string;
    phone?: string | null;
}

// Payload del wizard de alta — un objeto por paso del frontend (empresa, dueño, plan).
export interface RegisterCompanyInput {
    company: {
        name: string;
        document: string;
        country_id: number;
        ubigeo_id: number;
        address: string;
        phone_cell: string;
        phone?: string | null;
    };
    owner: {
        first_name: string;
        last_name: string;
        email: string;
        password: string;
        phone: string;
        country_id: number;
        document_type: DocumentType;
        document_number: string;
        date_birth?: string | null;
    };
    plan: {
        plan_public_id: string;
        billing_period: 'monthly' | 'yearly';
    };
}
