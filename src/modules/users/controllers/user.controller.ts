import type { Request, Response } from 'express';
import * as UserService from '../service/user.service';
import { toUserDetailDto } from '../dto/user.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toCompanyAssignmentsDto } from '../dto/companyUsers.dto';

export const listByCompany = async (req: Request, res: Response) => {
    const publicId = String(req.params.companyPublicId);
    const user = req.user!;
    const { company, assignments } = await UserService.listByCompany(publicId, user);
    return ApiResponse.ok(res, toCompanyAssignmentsDto(company, assignments), 'Usuarios obtenidos');
};

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
