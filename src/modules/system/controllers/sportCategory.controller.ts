import type { Request, Response } from 'express';
import * as SportCategoryService from '../service/sportCategory.service';
import { toSportCategoryDto } from '../dto/sportCategory.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';

// Lista todas las categorias de deportes para system
export const list = async (req: Request, res: Response) => {
    const { rows, count, referencesCount } = await SportCategoryService.list(req.validatedQuery);
    const pagination = toPaginationMeta(count, req.validatedQuery);
    return ApiResponse.ok(res, rows.map((row) => toSportCategoryDto(row, referencesCount[row.sport_category_id] ?? 0)), 'Categorías obtenidas exitosamente', 200, { pagination });
};

// Lista categorias de deportes activas para negocio
export const listActive = async (_req: Request, res: Response) => {
    const rows = await SportCategoryService.listActive();
    return ApiResponse.ok(res, rows.map((row) => toSportCategoryDto(row)), 'Categorías activas obtenidas exitosamente');
};

// Crea una nueva categoria
export const create = async (req: Request, res: Response) => {
    const result = await SportCategoryService.create(req.validatedData);
    return ApiResponse.created(res, toSportCategoryDto(result), 'Categoría deportiva creada exitosamente');
};

// Actualiza una categoria de deporte
export const update = async (req: Request, res: Response) => {
    const result = await SportCategoryService.update(Number(req.params.id), req.validatedData);
    return ApiResponse.ok(res, toSportCategoryDto(result), 'Categoría deportiva actualizada exitosamente');
};

// Elimina una categoria de deporte 
export const remove = async (req: Request, res: Response) => {
    await SportCategoryService.remove(Number(req.params.id));
    return ApiResponse.ok(res, null, 'Categoría deportiva eliminada exitosamente');
};
