import type { Request, Response } from 'express';
import * as SpaceService from '../service/space.service';
import { toSpaceDto } from '../dto/space.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Espacios deportivos de una sucursal.
export const listBySucursal = async (req: Request, res: Response) => {
    const rows = await SpaceService.listBySucursal(String(req.params.publicId), req.user!);
    return ApiResponse.ok(res, rows.map(toSpaceDto), 'Espacios obtenidos exitosamente');
};

// Alta de un espacio deportivo bajo una sucursal.
export const registerSpace = async (req: Request, res: Response) => {
    const space = await SpaceService.register(String(req.params.sucursalPublicId), req.validatedData, req.user!);
    return ApiResponse.created(res, toSpaceDto(space), 'Espacio registrado exitosamente');
};
