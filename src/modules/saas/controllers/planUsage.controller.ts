import type { Request, Response } from 'express';
import * as PlanLimitsService from '../service/planLimits.service';
import { toPlanUsageDto } from '../dto/planUsage.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

export const getPlanUsage = async (req: Request, res: Response) => {
    const { plan, usage } = await PlanLimitsService.getPlanUsage(String(req.params.tenantId), req.user!);
    return ApiResponse.ok(res, toPlanUsageDto(plan, usage), 'Uso del plan obtenido exitosamente');
};
