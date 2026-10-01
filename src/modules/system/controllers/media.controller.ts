import type { Request, Response } from 'express';
import * as MediaService from '../service/media.service';
import { toMediaDto } from '../dto/media.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Sube un archivo y lo registra para una entidad (Company/Sucursal por public_id).
export const upload = async (req: Request, res: Response) => {
    const result = await MediaService.register(req.file, req.validatedData, req.user!);
    return ApiResponse.created(res, toMediaDto(result), 'Archivo subido exitosamente');
};

// Archivos de una entidad — principal primero.
export const listByMedible = async (req: Request, res: Response) => {
    const rows = await MediaService.listByMedible(String(req.params.medibleType), String(req.params.mediblePublicId), req.user!);
    return ApiResponse.ok(res, rows.map(toMediaDto), 'Archivos obtenidos');
};

// Elimina el archivo físico y su registro.
export const remove = async (req: Request, res: Response) => {
    await MediaService.remove(String(req.params.publicId), req.user!);
    return ApiResponse.ok(res, null, 'Archivo eliminado exitosamente');
};
