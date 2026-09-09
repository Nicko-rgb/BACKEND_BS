import type { Request, Response } from 'express';
import * as CompanyService from '../service/company.service';
import { toCompanyListDto } from '../dto/company.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';

// Lista las empresas principales, paginado, con su dueño y su plan — el alcance según el rol del caller se resuelve en company.service.ts
export const list = async (req: Request, res: Response) => {
    const { rows, count, plans } = await CompanyService.list(req.validatedQuery, req.user!);
    const data = rows.map((row) => toCompanyListDto(row, plans[row.company_id] ?? null) );
    const pagination = toPaginationMeta(count, req.validatedQuery);

    return ApiResponse.ok( res, data, 'Empresas obtenidas', 200, { pagination } );
};

// Alta de empresa (wizard de 3 pasos) — crea Company+User+Person+UserCompany+permisos+
// SaaSSubscription en estado pendiente de pago (ver company.service.ts → register).
export const registerCompany = async (req: Request, res: Response) => {
    const { company, plan, paymentUrl } = await CompanyService.register(req.validatedData, req.user!);
    return ApiResponse.created(res, toCompanyListDto(company, plan), 'Empresa registrada — pendiente de pago', { paymentUrl });
};
