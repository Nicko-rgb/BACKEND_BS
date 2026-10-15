import type { Request, Response } from 'express';
import * as PermissionService from '../service/permission.service';
import { toPermissionDto } from '../dto/permission.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';

// Lista el catálogo de permisos — con page/limit pagina; sin ellos trae todo.
// `search` busca por key/label; `module`/`group` filtran (combinables).
export const listAdmin = async (req: Request, res: Response) => {
    const { rows, count, usage, referencesCount, paginated, page, limit } = await PermissionService.listAll(req.validatedQuery);
    const pagination = paginated
        ? toPaginationMeta(count, { page, limit })
        : { page: 1, limit: count || 1, total: count, totalPages: 1 };
    return ApiResponse.ok(res, rows.map((row) => toPermissionDto(row, usage[row.key] ?? 0, referencesCount[row.key] ?? 0)), 'Permisos obtenidos exitosamente', 200, { pagination });
};

// Módulos y grupos distintos del catálogo, en un solo request — para los filtros del frontend
export const listModules = async (_req: Request, res: Response) => {
    const result = await PermissionService.listModules();
    return ApiResponse.ok(res, result, 'Módulos y grupos obtenidos exitosamente');
};

// Servida dinámica para pickers — system ve todo, el resto solo lo repartible.
export const listAssignable = async (req: Request, res: Response) => {
    const isSystem = (req.user?.permissions ?? []).includes('system.full_access');
    const rows = await PermissionService.listAssignable(isSystem);
    return ApiResponse.ok(res, rows.map((row) => toPermissionDto(row)), 'Permisos asignables obtenidos exitosamente');
};

// Crea un permiso nuevo
export const create = async (req: Request, res: Response) => {
    const result = await PermissionService.create(req.validatedData);
    return ApiResponse.created(res, toPermissionDto(result), 'Permiso creado exitosamente');
};

// Actualiza un permiso existente
export const update = async (req: Request, res: Response) => {
    const result = await PermissionService.update(Number(req.params.id), req.validatedData);
    return ApiResponse.ok(res, toPermissionDto(result), 'Permiso actualizado exitosamente');
};

// Elimina un permiso
export const remove = async (req: Request, res: Response) => {
    await PermissionService.remove(Number(req.params.id));
    return ApiResponse.ok(res, null, 'Permiso eliminado exitosamente');
};
