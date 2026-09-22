import type { Request, Response } from 'express';
import * as PlanService from '../service/plan.service';
import { toPlanDto } from '../dto/plan.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Lista todos los planes (activos e inactivos) para system, sin paginar
export const list = async (_req: Request, res: Response) => {
    const { rows, referencesCount } = await PlanService.list();
    return ApiResponse.ok(res, rows.map((row) => toPlanDto(row, referencesCount[row.plan_id] ?? 0)), 'Planes obtenidos exitosamente');
};

// Lista todos los planes solo activos
export const listActive = async (_req: Request, res: Response) => {
    const rows = await PlanService.listActive();
    return ApiResponse.ok(res, rows.map((row) => toPlanDto(row)), 'Planes activos obtenidos exitosamente');
};

// Actualiza un plan
export const update = async (req: Request, res: Response) => {
    const result = await PlanService.update(String(req.params.publicId), req.validatedData);
    return ApiResponse.ok(res, toPlanDto(result), 'Plan actualizado exitosamente');
};

// Elimina un plan
export const remove = async (req: Request, res: Response) => {
    await PlanService.remove(String(req.params.publicId));
    return ApiResponse.ok(res, null, 'Plan eliminado exitosamente');
};
