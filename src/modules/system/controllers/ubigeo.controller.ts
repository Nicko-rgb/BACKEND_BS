import type { Request, Response } from 'express';
import * as UbigeoService from '../service/ubigeo.service';
import { toUbigeoDto, toUbigeoNodeDto } from '../dto/ubigeo.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Lista ubigeos en arbol jerarquico
export const listChildren = async (req: Request, res: Response) => {
    const { country_id: countryId, parent_id: parentId } = req.validatedQuery;
    const { rows, idsWithChildren } = await UbigeoService.listChildren({ countryId, parentId });
    const hasChildrenSet = new Set(idsWithChildren);
    const data = rows.map((row) => toUbigeoNodeDto(row, hasChildrenSet.has(row.ubigeo_id)));
    return ApiResponse.ok(res, data, 'Ubigeo obtenido exitosamente');
};

// Crea nuevo ubigeo
export const create = async (req: Request, res: Response) => {
    const result = await UbigeoService.create(req.validatedData);
    return ApiResponse.created(res, toUbigeoDto(result), 'Ubigeo creado exitosamente');
};

// Actualiza Ubigeo
export const update = async (req: Request, res: Response) => {
    const result = await UbigeoService.update(Number(req.params.id), req.validatedData);
    return ApiResponse.ok(res, toUbigeoDto(result), 'Ubigeo actualizado exitosamente');
};

// Elimina ubigeo
export const remove = async (req: Request, res: Response) => {
    await UbigeoService.remove(Number(req.params.id));
    return ApiResponse.ok(res, null, 'Ubigeo eliminado exitosamente');
};
