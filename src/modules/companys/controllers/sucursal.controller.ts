import type { Request, Response } from 'express';
import * as SucursalService from '../service/sucursal.service';
import { toSucursalDto } from '../dto/sucursal.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Alta de sucursal — companyPublicId es el public_id de la empresa padre (ver sucursal.service.ts → register).
export const registerSucursal = async (req: Request, res: Response) => {
    const sucursal = await SucursalService.register(String(req.params.companyPublicId), req.validatedData, req.user!);
    return ApiResponse.created(res, toSucursalDto(sucursal), 'Sucursal registrada exitosamente');
};

// Detalle de una sucursal — busca por su propio public_id.
export const getByPublicId = async (req: Request, res: Response) => {
    const sucursal = await SucursalService.getByPublicId(String(req.params.publicId), req.user!);
    return ApiResponse.ok(res, toSucursalDto(sucursal), 'Sucursal obtenida');
};

// Actualiza los datos de una sucursal.
export const updateByPublicId = async (req: Request, res: Response) => {
    const sucursal = await SucursalService.updateByPublicId(String(req.params.publicId), req.validatedData, req.user!);
    return ApiResponse.ok(res, toSucursalDto(sucursal), 'Sucursal actualizada exitosamente');
};
