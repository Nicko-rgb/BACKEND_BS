import type { DocumentType } from '../../users/interfaces/user.interface';
import type { PaginationQuery } from '../../../shared/types/pagination';
import type { Company, Space } from '../database/models';

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
    // Empresa de origen dentro del árbol del usuario; requerida si hay varios grupos.
    source_company_public_id?: string;
    company: {
        name: string;
        document: string;
        country_id: number;
        ubigeo_id: number;
        address: string;
        phone_cell: string;
        phone?: string | null;
    };
    owner?: {
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
    plan?: {
        plan_public_id: string;
        billing_period: 'monthly' | 'yearly';
    };
}

/**
 * Árbol liviano empresa → sucursales → espacios para los selectores del
 * calendario de reservas. Solo se expone nombre + public_id de cada nodo y la
 * ventana operativa de la sucursal (apertura/cierre de su configuración).
 */
export interface CompanyTreeBranchNode {
    branch: Company;
    spaces: Space[];
    /** Ventana operativa de la sucursal; null si todavía no tiene configuración. */
    configuration: {
        opening_time: string;
        closing_time: string;
    } | null;
}

export interface CompanyTree {
    company: Company;
    branches: CompanyTreeBranchNode[];
}
