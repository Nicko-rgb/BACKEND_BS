import type { Request, Response } from 'express';
import * as UserService from '../service/user.service';
import { toUserDto, toUserDetailDto } from '../dto/user.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';

// Lista todos los usuarios del sistema, paginado, con búsqueda y filtros por rol y país
export const list = async (req: Request, res: Response) => {
    const { rows, count } = await UserService.list(req.validatedQuery);
    const pagination = toPaginationMeta(count, req.validatedQuery);
    return ApiResponse.ok(res, rows.map(toUserDto), 'Usuarios obtenidos exitosamente', 200, { pagination });
};

// Detalle completo de un usuario, para el formulario de edición
export const getById = async (req: Request, res: Response) => {
    const user = await UserService.getById(Number(req.params.id));
    return ApiResponse.ok(res, toUserDetailDto(user), 'Usuario obtenido exitosamente');
};

// Actualiza los datos de un usuario — todo menos password
export const update = async (req: Request, res: Response) => {
    const user = await UserService.update(Number(req.params.id), req.validatedData);
    return ApiResponse.ok(res, toUserDetailDto(user), 'Usuario actualizado exitosamente');
};
