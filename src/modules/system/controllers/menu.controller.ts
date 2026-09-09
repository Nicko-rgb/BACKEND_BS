import type { Request, Response } from 'express';
import * as MenuService from '../service/menu.service';
import { toMenuItemDto, toMenuItemAdminDto } from '../dto/menu.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';

// Carga los menus correspondientes al usuario
export const getMenu = async (req: Request, res: Response) => {
    const app = req.user?.app === 'booking' ? 'booking' : 'admin';
    const items = await MenuService.getMenuForUser(req.user!, app);
    return ApiResponse.ok(res, items.map(toMenuItemDto), 'Menú obtenido exitosamente');
};

// Lista todos los menus para administrar system menu
export const listAdmin = async (req: Request, res: Response) => {
    const { rows, count, childrenCount, roleIdsByMenuId } = await MenuService.listAll(req.validatedQuery);
    const pagination = toPaginationMeta(count, req.validatedQuery);
    return ApiResponse.ok(
        res,
        rows.map((row) => toMenuItemAdminDto(row, childrenCount[row.key] ?? 0, roleIdsByMenuId[row.menu_id] ?? [])),
        'Menús obtenidos exitosamente',
        200,
        { pagination }
    );
};

// Crea un ítem de menú nuevo
export const create = async (req: Request, res: Response) => {
    const { item, roleIds } = await MenuService.create(req.validatedData);
    return ApiResponse.created(res, toMenuItemAdminDto(item, 0, roleIds), 'Ítem de menú creado exitosamente');
};

// Actualiza un ítem de menú existente
export const update = async (req: Request, res: Response) => {
    const { item, roleIds } = await MenuService.update(Number(req.params.id), req.validatedData);
    return ApiResponse.ok(res, toMenuItemAdminDto(item, 0, roleIds), 'Ítem de menú actualizado exitosamente');
};

// Elimina un ítem de menú
export const remove = async (req: Request, res: Response) => {
    await MenuService.remove(Number(req.params.id));
    return ApiResponse.ok(res, null, 'Ítem de menú eliminado exitosamente');
};
