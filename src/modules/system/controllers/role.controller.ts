import type { Request, Response } from 'express';
import * as RoleService from '../service/role.service';
import { toRoleDto } from '../dto/role.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Roles visibles para el usuario autenticado
export const listAll = async (req: Request, res: Response) => {
    const roles = await RoleService.listAll(req.user!);
    return ApiResponse.ok(res, roles.map(toRoleDto), 'Roles obtenidos exitosamente');
};

// Crea un rol nuevo
export const create = async (req: Request, res: Response) => {
    const result = await RoleService.create(req.validatedData);
    return ApiResponse.created(res, toRoleDto(result), 'Rol creado exitosamente');
};

// Actualiza un rol existente (label/scope_level/is_active)
export const update = async (req: Request, res: Response) => {
    const result = await RoleService.update(Number(req.params.id), req.validatedData);
    return ApiResponse.ok(res, toRoleDto(result), 'Rol actualizado exitosamente');
};

// Elimina un rol — bloqueado si es uno de los roles base o si todavía tiene usuarios asignados
export const remove = async (req: Request, res: Response) => {
    await RoleService.remove(Number(req.params.id));
    return ApiResponse.ok(res, null, 'Rol eliminado exitosamente');
};

// Keys de los permisos base de un rol
export const getPermissions = async (req: Request, res: Response) => {
    const keys = await RoleService.getPermissionKeys(Number(req.params.id));
    return ApiResponse.ok(res, keys, 'Permisos del rol obtenidos exitosamente');
};

// Reemplaza el set completo de permisos base de un rol
export const replacePermissions = async (req: Request, res: Response) => {
    const keys = await RoleService.replacePermissions(Number(req.params.id), req.validatedData.permission_keys);
    return ApiResponse.ok(res, keys, 'Permisos del rol actualizados exitosamente');
};
