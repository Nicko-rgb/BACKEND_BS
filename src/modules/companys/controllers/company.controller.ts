import type { Request, Response } from 'express';
import * as CompanyService from '../service/company.service';
import { toCompanyListDto, toCompanyDetailDto } from '../dto/company.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';

// Lista las empresas principales, paginado, con su dueño y su plan — el alcance según el rol del caller se resuelve en company.service.ts
export const list = async (req: Request, res: Response) => {
    const { rows, count, plans } = await CompanyService.list(req.validatedQuery, req.user!);
    const data = rows.map((row) => toCompanyListDto(row, plans[row.company_id] ?? null) );
    const pagination = toPaginationMeta(count, req.validatedQuery);

    return ApiResponse.ok( res, data, 'Empresas obtenidas', 200, { pagination } );
};

// Detalle de una empresa — busca por tenant_id, no por company_id (ver company.service.ts → getByTenantId).
export const getByTenantId = async (req: Request, res: Response) => {
    const company = await CompanyService.getByTenantId(String(req.params.tenantId), req.user!);
    return ApiResponse.ok(res, toCompanyDetailDto(company), 'Empresa obtenida');
};

// Autoedición de la propia empresa — sin `document` (RUC), ver company.service.ts → updateByTenantId.
export const updateByTenantId = async (req: Request, res: Response) => {
    const company = await CompanyService.updateByTenantId(String(req.params.tenantId), req.validatedData, req.user!);
    return ApiResponse.ok(res, toCompanyDetailDto(company), 'Empresa actualizada exitosamente');
};

// Alta de empresa (wizard de 3 pasos) — crea Company+User+Person+UserCompany+SaaSSubscription
// ya activa, sin comunicarse con MercadoPago (ver company.service.ts → register).
export const registerCompany = async (req: Request, res: Response) => {
    const { company, plan } = await CompanyService.register(req.validatedData, req.user!);
    return ApiResponse.created(res, toCompanyListDto(company, plan), 'Empresa registrada exitosamente');
};
