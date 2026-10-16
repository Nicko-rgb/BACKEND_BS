import type { Request, Response } from 'express';
import * as SucursalService from '../service/sucursal.service';
import { toSucursalDto } from '../dto/sucursal.dto';
import * as SucursalBannerService from '../service/sucursalBanner.service';
import { toMediaDto } from '../../system/dto/media.dto';
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



// Portada actual de la sucursal — null si no tiene.
export const getBanner = async (req: Request, res: Response) => {
    const banner = await SucursalBannerService.getBanner(String(req.params.publicId), req.user!);
    return ApiResponse.ok(res, banner ? toMediaDto(banner) : null, 'Portada obtenida exitosamente');
};

// Sube la portada (pasa a ser la primaria, desmarca la anterior).
export const uploadBanner = async (req: Request, res: Response) => {
    const banner = await SucursalBannerService.uploadBanner(String(req.params.publicId), req.file, req.user!, req.body?.description ?? null);
    return ApiResponse.created(res, toMediaDto(banner), 'Portada actualizada exitosamente');
};

// Elimina la portada actual (físico + registro).
export const removeBanner = async (req: Request, res: Response) => {
    await SucursalBannerService.removeBanner(String(req.params.publicId), req.user!);
    return ApiResponse.ok(res, null, 'Portada eliminada exitosamente');
};
