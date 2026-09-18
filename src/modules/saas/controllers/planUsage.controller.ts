import type { Request, Response } from 'express';
import * as PlanLimitsService from '../service/planLimits.service';
import { toPlanUsageDto } from '../dto/planUsage.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

export const getPlanUsage = async (req: Request, res: Response) => {
    const { plan, primaryCompany, usage } = await PlanLimitsService.getPlanUsage(Number(req.params.companyId), req.user!);
    return ApiResponse.ok(res, toPlanUsageDto(plan, primaryCompany, usage), 'Uso del plan obtenido exitosamente');
};
