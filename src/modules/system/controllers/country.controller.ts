import type { Request, Response } from 'express';
import * as CountryService from '../service/country.service';
import { toCountryDto } from '../dto/country.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { BadRequestError } from '../../../shared/errors/CustomErrors';

// Lista todos los países para system, sin paginar
export const list = async (_req: Request, res: Response) => {
    const { rows, referencesCount } = await CountryService.list();
    return ApiResponse.ok(res, rows.map((row) => toCountryDto(row, referencesCount[row.country_id] ?? 0)), 'Países obtenidos exitosamente');
};

// Catálogo público: solo activos por defecto, o todos con includeInactive=true.
export const listActive = async (req: Request, res: Response) => {
    const { includeInactive } = req.query;
    if (includeInactive !== undefined && includeInactive !== 'true' && includeInactive !== 'false') {
        throw new BadRequestError('Parámetro invalido');
    }
    const rows = await CountryService.listActive(includeInactive === 'true');
    return ApiResponse.ok(res, rows.map((row) => toCountryDto(row)), 'Países obtenidos exitosamente');
};

// Crea nuevo pais
export const create = async (req: Request, res: Response) => {
    const result = await CountryService.create(req.validatedData, req.user);
    return ApiResponse.created(res, toCountryDto(result), 'País creado exitosamente');
};

// Actualiza pais
export const update = async (req: Request, res: Response) => {
    const result = await CountryService.update(Number(req.params.id), req.validatedData);
    return ApiResponse.ok(res, toCountryDto(result), 'País actualizado exitosamente');
};

// Elimina un pais
export const remove = async (req: Request, res: Response) => {
    await CountryService.remove(Number(req.params.id));
    return ApiResponse.ok(res, null, 'País eliminado exitosamente');
};
