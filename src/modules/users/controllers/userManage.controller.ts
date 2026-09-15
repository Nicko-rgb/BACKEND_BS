import type { Request, Response } from 'express';
import * as UserManageService from '../service/userManage.service';
import { toUserDto } from '../dto/user.dto';
import { toManagedUserDto } from '../dto/userManage.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';
import { NotFoundError } from '../../../shared/errors/CustomErrors';

// :id de la ruta como entero positivo — cualquier otro valor se trata como usuario inexistente.
const parseUserId = (value: string): number => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new NotFoundError('Usuario no encontrado');
    return id;
};

// Catálogo global de usuarios, paginado, con búsqueda y filtros por rol y país.
export const list = async (req: Request, res: Response) => {
    const { rows, count } = await UserManageService.list(req.validatedQuery);
    const pagination = toPaginationMeta(count, req.validatedQuery);
    return ApiResponse.ok(res, rows.map(toUserDto), 'Usuarios obtenidos exitosamente', 200, { pagination });
};

export const getById = async (req: Request, res: Response) => {
    const { user, assignments } = await UserManageService.getById(String(req.params.role), parseUserId(String(req.params.id)), req.user!);
    return ApiResponse.ok(res, toManagedUserDto(user, assignments), 'Usuario obtenido exitosamente');
};

export const create = async (req: Request, res: Response) => {
    const { user, assignments } = await UserManageService.create(String(req.params.role), req.validatedData, req.user!);
    return ApiResponse.created(res, toManagedUserDto(user, assignments), 'Usuario registrado exitosamente');
};

export const update = async (req: Request, res: Response) => {
    const { user, assignments } = await UserManageService.update(String(req.params.role), parseUserId(String(req.params.id)), req.validatedData, req.user!);
    return ApiResponse.ok(res, toManagedUserDto(user, assignments), 'Usuario actualizado exitosamente');
};
