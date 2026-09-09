import type { Request, Response } from 'express';
import * as PermissionService from '../service/permission.service';
import { toPermissionDto } from '../dto/permission.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';

// Lista el catálogo de permisos — paginado, o búsqueda completa por key/label sin paginar
export const listAdmin = async (req: Request, res: Response) => {
    const { rows, count, usage, referencesCount } = await PermissionService.listAll(req.validatedQuery);
    const isSearch = Boolean(req.validatedQuery.search);
    const pagination = isSearch
        ? { page: 1, limit: count || 1, total: count, totalPages: 1 }
        : toPaginationMeta(count, req.validatedQuery);
    return ApiResponse.ok(res, rows.map((row) => toPermissionDto(row, usage[row.key] ?? 0, referencesCount[row.key] ?? 0)), 'Permisos obtenidos exitosamente', 200, { pagination });
};

// Módulos distintos del catálogo — para el filtro por módulo del frontend
export const listModules = async (_req: Request, res: Response) => {
    const modules = await PermissionService.listModules();
    return ApiResponse.ok(res, modules, 'Módulos obtenidos exitosamente');
};

// Catálogo completo, sin paginar — para pickers de checkboxes (ej. asignar permisos a un usuario)
export const listCatalog = async (_req: Request, res: Response) => {
    const rows = await PermissionService.listCatalog();
    return ApiResponse.ok(res, rows.map((row) => toPermissionDto(row)), 'Catálogo de permisos obtenido exitosamente');
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
