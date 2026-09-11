import type { Request, Response } from 'express';
import * as SucursalService from '../service/sucursal.service';
import { toSucursalDto } from '../dto/sucursal.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Alta de sucursal — companyTenantId es el tenant_id de la empresa padre (ver sucursal.service.ts → register).
export const registerSucursal = async (req: Request, res: Response) => {
    const sucursal = await SucursalService.register(String(req.params.companyTenantId), req.validatedData, req.user!);
    return ApiResponse.created(res, toSucursalDto(sucursal), 'Sucursal registrada exitosamente');
};

// Detalle de una sucursal — busca por su propio tenant_id.
export const getByTenantId = async (req: Request, res: Response) => {
    const sucursal = await SucursalService.getByTenantId(String(req.params.tenantId), req.user!);
    return ApiResponse.ok(res, toSucursalDto(sucursal), 'Sucursal obtenida');
};

// Actualiza los datos de una sucursal.
export const updateByTenantId = async (req: Request, res: Response) => {
    const sucursal = await SucursalService.updateByTenantId(String(req.params.tenantId), req.validatedData, req.user!);
    return ApiResponse.ok(res, toSucursalDto(sucursal), 'Sucursal actualizada exitosamente');
};
