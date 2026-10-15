import type { Request, Response } from 'express';
import * as UserPermissionService from '../service/userPermission.service';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Keys del set efectivo de permisos de un usuario — por public_id
export const getByUserId = async (req: Request, res: Response) => {
    const keys = await UserPermissionService.getKeysByUserId(String(req.params.publicId), req.user!);
    return ApiResponse.ok(res, keys, 'Permisos del usuario obtenidos exitosamente');
};

// Reemplaza el set completo de permisos de un usuario
export const update = async (req: Request, res: Response) => {
    const keys = await UserPermissionService.replaceForUser(String(req.params.publicId), req.validatedData.permission_keys, req.user!);
    return ApiResponse.ok(res, keys, 'Permisos actualizados exitosamente');
};
