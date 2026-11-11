import type { Request, Response } from 'express';
import * as PlanLimitsService from '../service/planLimits.service';
import { toPlanUsageDto, toPlanUsageOverviewDto } from '../dto/planUsage.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

export const getPlanUsage = async (req: Request, res: Response) => {
    const { plan, primaryCompany, usage } = await PlanLimitsService.getPlanUsage(String(req.params.companyPublicId), req.user!);
    return ApiResponse.ok(res, toPlanUsageDto(plan, primaryCompany, usage), 'Uso del plan obtenido exitosamente');
};

export const getPlanUsageOverview = async (req: Request, res: Response) => {
    const { company, subscription, primaryCompany, companiesCount, companyUsage } =
        await PlanLimitsService.getPlanUsageOverview(String(req.params.companyPublicId), req.user!);
    return ApiResponse.ok(res, toPlanUsageOverviewDto(company, subscription, primaryCompany, companiesCount, companyUsage), 'Resumen de uso del plan obtenido exitosamente');
};
