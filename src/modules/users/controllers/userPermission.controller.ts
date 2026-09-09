import type { Request, Response } from 'express';
import * as UserPermissionService from '../service/userPermission.service';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Keys de los permisos directos de un usuario
export const getByUserId = async (req: Request, res: Response) => {
    const keys = await UserPermissionService.getKeysByUserId(Number(req.params.id));
    return ApiResponse.ok(res, keys, 'Permisos del usuario obtenidos exitosamente');
};

// Reemplaza el set completo de permisos directos de un usuario
export const update = async (req: Request, res: Response) => {
    const keys = await UserPermissionService.replaceForUser(Number(req.params.id), req.validatedData.permission_keys, req.user!.user_id);
    return ApiResponse.ok(res, keys, 'Permisos actualizados exitosamente');
};
