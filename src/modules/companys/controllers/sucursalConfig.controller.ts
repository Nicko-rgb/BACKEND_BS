import type { Request, Response } from 'express';
import * as SucursalConfigService from '../service/sucursalConfig.service';
import { toSucursalConfigDto } from '../dto/sucursalConfig.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Configuración de una sucursal — 404 si todavía no tiene (el modal abre en modo registro).
export const getConfiguration = async (req: Request, res: Response) => {
    const sucursalPublicId = String(req.params.sucursalPublicId);
    const user = req.user;
    const { configuration } = await SucursalConfigService.getBySucursalPublicId(sucursalPublicId, user!);
    return ApiResponse.ok(res, toSucursalConfigDto(configuration), 'Configuración obtenida');
};

// Upsert — crea si no existe, actualiza si existe (misma llamada para registro y edición).
// El estado de la sucursal NO se toca acá: tiene su propio endpoint (PATCH /sucursals/:publicId/status).
export const saveConfiguration = async (req: Request, res: Response) => {
    const sucursalPublicId = String(req.params.sucursalPublicId);
    const data = req.validatedData;
    const user = req.user;
    const { configuration } = await SucursalConfigService.saveBySucursalPublicId(sucursalPublicId, data, user!);
    return ApiResponse.ok(res, toSucursalConfigDto(configuration), 'Configuración guardada exitosamente');
};
