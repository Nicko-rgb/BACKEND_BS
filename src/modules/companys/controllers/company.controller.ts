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

// Detalle de una empresa — busca por public_id, nunca por company_id/tenant_id (ver company.service.ts → getByPublicId).
export const getByPublicId = async (req: Request, res: Response) => {
    const { company, assignments } = await CompanyService.getByPublicId(String(req.params.publicId), req.user!);
    return ApiResponse.ok(res, toCompanyDetailDto(company, assignments), 'Empresa obtenida');
};

// Autoedición de la propia empresa — sin `document` (RUC), ver company.service.ts → updateByPublicId.
export const updateByPublicId = async (req: Request, res: Response) => {
    const { company, assignments } = await CompanyService.updateByPublicId(String(req.params.publicId), req.validatedData, req.user!);
    return ApiResponse.ok(res, toCompanyDetailDto(company, assignments), 'Empresa actualizada exitosamente');
};

// Alta de empresa (wizard de 3 pasos) — crea Company+User+Person+UserCompany+SaaSSubscription
// ya activa, sin comunicarse con MercadoPago (ver company.service.ts → register).
export const registerCompany = async (req: Request, res: Response) => {
    const { company, plan } = await CompanyService.register(req.validatedData, req.user!);
    return ApiResponse.created(res, toCompanyListDto(company, plan), 'Empresa registrada exitosamente');
};
