import type { Request, Response } from 'express';
import * as SucursalConfigService from '../service/sucursalConfig.service';
import { toSucursalConfigDto } from '../dto/sucursalConfig.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Configuración de una sucursal — 404 si todavía no tiene (el modal abre en modo registro).
export const getConfiguration = async (req: Request, res: Response) => {
    const { configuration } = await SucursalConfigService.getBySucursalPublicId(String(req.params.sucursalPublicId), req.user!);
    return ApiResponse.ok(res, toSucursalConfigDto(configuration), 'Configuración obtenida');
};

// Upsert — crea si no existe, actualiza si existe (misma llamada para registro y edición).
// El estado de la sucursal NO se toca acá: tiene su propio endpoint (PATCH /sucursals/:publicId/status).
export const saveConfiguration = async (req: Request, res: Response) => {
    const { configuration } = await SucursalConfigService.saveBySucursalPublicId(String(req.params.sucursalPublicId), req.validatedData, req.user!);
    return ApiResponse.ok(res, toSucursalConfigDto(configuration), 'Configuración guardada exitosamente');
};
