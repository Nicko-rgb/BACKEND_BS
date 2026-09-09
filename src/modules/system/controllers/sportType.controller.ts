import type { Request, Response } from 'express';
import * as SportTypeService from '../service/sportType.service';
import { toSportTypeDto } from '../dto/sportType.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';

// Lista todos los tipos de deporte para system
export const list = async (req: Request, res: Response) => {
    const { rows, count, referencesCount } = await SportTypeService.list(req.validatedQuery);
    const pagination = toPaginationMeta(count, req.validatedQuery);
    return ApiResponse.ok(res, rows.map((row) => toSportTypeDto(row, referencesCount[row.sport_type_id] ?? 0)), 'Deportes obtenidos exitosamente', 200, { pagination });
};

// Lista deportes activos para negocio
export const listActive = async (_req: Request, res: Response) => {
    const rows = await SportTypeService.listActive();
    return ApiResponse.ok(res, rows.map((row) => toSportTypeDto(row)), 'Deportes activos obtenidos exitosamente');
};

// Crea nuevo tipo de deportes
export const create = async (req: Request, res: Response) => {
    const result = await SportTypeService.create(req.validatedData);
    return ApiResponse.created(res, toSportTypeDto(result), 'Tipo de deporte creado exitosamente');
};

// Actualiza un tipo de deporte
export const update = async (req: Request, res: Response) => {
    const result = await SportTypeService.update(Number(req.params.id), req.validatedData);
    return ApiResponse.ok(res, toSportTypeDto(result), 'Tipo de deporte actualizado exitosamente');
};

// Elimina un tipo de deporte
export const remove = async (req: Request, res: Response) => {
    await SportTypeService.remove(Number(req.params.id));
    return ApiResponse.ok(res, null, 'Tipo de deporte eliminado exitosamente');
};
