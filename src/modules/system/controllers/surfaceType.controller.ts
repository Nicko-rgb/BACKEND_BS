import type { Request, Response } from 'express';
import * as SurfaceTypeService from '../service/surfaceType.service';
import { toSurfaceTypeDto } from '../dto/surfaceType.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';

// Lista tipos superficies para system
export const list = async (req: Request, res: Response) => {
    const { rows, count, referencesCount } = await SurfaceTypeService.list(req.validatedQuery);
    const pagination = toPaginationMeta(count, req.validatedQuery);
    return ApiResponse.ok(res, rows.map((row) => toSurfaceTypeDto(row, referencesCount[row.surface_type_id] ?? 0)), 'Superficies obtenidas exitosamente', 200, { pagination });
};

// Lista tipos de superficie sin paginar para logica de negocio
export const listActive = async (_req: Request, res: Response) => {
    const rows = await SurfaceTypeService.listActive();
    return ApiResponse.ok(res, rows.map((row) => toSurfaceTypeDto(row)), 'Superficies activas obtenidas exitosamente');
};

// Crear nuevo tipo de superficie
export const create = async (req: Request, res: Response) => {
    const result = await SurfaceTypeService.create(req.validatedData);
    return ApiResponse.created(res, toSurfaceTypeDto(result), 'Tipo de superficie creado exitosamente');
};

// Actualiza tipo de superficie
export const update = async (req: Request, res: Response) => {
    const result = await SurfaceTypeService.update(Number(req.params.id), req.validatedData);
    return ApiResponse.ok(res, toSurfaceTypeDto(result), 'Tipo de superficie actualizado exitosamente');
};

// Elimina tipo de superficie
export const remove = async (req: Request, res: Response) => {
    await SurfaceTypeService.remove(Number(req.params.id));
    return ApiResponse.ok(res, null, 'Tipo de superficie eliminado exitosamente');
};
