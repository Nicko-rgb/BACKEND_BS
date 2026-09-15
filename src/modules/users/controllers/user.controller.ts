import type { Request, Response } from 'express';
import * as UserService from '../service/user.service';
import { toUserDetailDto } from '../dto/user.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Detalle del propio perfil — el id siempre es el del usuario autenticado, nunca uno de req.params
export const getOwnProfile = async (req: Request, res: Response) => {
    const user = await UserService.getById(req.user!.user_id);
    return ApiResponse.ok(res, toUserDetailDto(user), 'Perfil obtenido exitosamente');
};

// Autoedición del propio perfil — el id siempre es el del usuario autenticado, nunca uno de req.params
export const updateOwnProfile = async (req: Request, res: Response) => {
    const user = await UserService.updateOwnProfile(req.user!.user_id, req.validatedData);
    return ApiResponse.ok(res, toUserDetailDto(user), 'Perfil actualizado exitosamente');
};
