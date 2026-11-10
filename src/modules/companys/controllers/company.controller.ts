import type { Request, Response } from 'express';
import * as CompanyService from '../service/company.service';
import * as CompanyContextService from '../service/companyContext.service';
import { toCompanyListDto, toCompanyDetailDto } from '../dto/company.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';
import type { AuthenticatedUser } from '../../../shared/types/auth';

// Lista las empresas principales, paginado, con su dueño y su plan — el alcance según el rol del caller se resuelve en company.service.ts
export const list = async (req: Request, res: Response) => {
    const data = req.validatedQuery;
    const user = req.user;
    const { rows, count, plans } = await CompanyService.list(data, user!);
    const companys = rows.map((row) => toCompanyListDto(row, plans[row.company_id] ?? null) );
    const pagination = toPaginationMeta(count, req.validatedQuery);

    return ApiResponse.ok( res, companys, 'Empresas obtenidas', 200, { pagination } );
};

// Detalle de una empresa — busca por public_id, nunca por company_id/tenant_id (ver company.service.ts → getByPublicId).
export const getByPublicId = async (req: Request, res: Response) => {
    const publicId = String(req.params.publicId)
    const user = req.user;
    const company = await CompanyService.getByPublicId(publicId, user!);
    return ApiResponse.ok(res, toCompanyDetailDto(company), 'Empresa obtenida');
};

// Autoedición de la propia empresa — sin `document` (RUC), ver company.service.ts → updateByPublicId.
export const updateByPublicId = async (req: Request, res: Response) => {
    const publicId = String(req.params.publicId)
    const data = req.validatedData;
    const user = req.user;
    const company = await CompanyService.updateByPublicId(publicId, data, user!);
    return ApiResponse.ok(res, toCompanyDetailDto(company), 'Empresa actualizada exitosamente');
};

// Alta de primaria (system, suscripción nueva) o hermana (suscripción heredada del árbol).
export const registerCompany = async (req: Request, res: Response) => {
    const data = req.validatedData;
    const user = req.user;
    const { company, plan } = await CompanyService.register(data, user!);
    return ApiResponse.created(res, toCompanyListDto(company, plan), 'Empresa registrada exitosamente');
};

// Árbol público empresa → sucursales → espacios, con moneda y ventana operativa.
// Ahora servido por companyContext.service.getCompanyContextTree (única fuente de verdad).
export const getBranchTree = async (req: Request, res: Response) => {
    const sucursalPublicId = String(req.params.sucursalPublicId);
    const user = req.user as Pick<AuthenticatedUser, 'scope_level' | 'company_ids' | 'user_id'> | undefined;
    const tree = await CompanyContextService.getCompanyContextTree(user, sucursalPublicId);
    return ApiResponse.ok(res, tree, 'Árbol de empresa obtenido');
};
