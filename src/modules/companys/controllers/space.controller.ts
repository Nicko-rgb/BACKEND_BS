import type { Request, Response } from 'express';
import * as SpaceService from '../service/space.service';
import * as SpaceGalleryService from '../service/spaceGallery.service';
import { toSpaceDto } from '../dto/space.dto';
import { toMediaDto } from '../../system/dto/media.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Espacios deportivos de una sucursal.
export const listBySucursal = async (req: Request, res: Response) => {
    const sucursalPublicId = String(req.params.sucursalPublicId);
    const rows = await SpaceService.listBySucursal(sucursalPublicId, req.user!);
    return ApiResponse.ok(res, rows.map(toSpaceDto), 'Espacios obtenidos exitosamente');
};

// Alta de un espacio deportivo bajo una sucursal - para pagina Sucursal.tsx.
export const registerSpace = async (req: Request, res: Response) => {
    const sucursalPublicId = String(req.params.sucursalPublicId);
    const space = await SpaceService.register(sucursalPublicId, req.validatedData, req.user!);
    return ApiResponse.created(res, toSpaceDto(space), 'Espacio registrado exitosamente');
};

// Detalle de un espacio deportivo - para pagina Sucursal.tsx.
export const spaceById = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const space = await SpaceService.spaceById(spacePublicId, req.user!);
    return ApiResponse.ok(res, toSpaceDto(space), 'Espacio deportivo obtenido exitosamente');
};

// Actualización de un espacio deportivo - para pagina Space.tsx.
export const updateSpace = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const space = await SpaceService.update(spacePublicId, req.validatedData, req.user!);
    return ApiResponse.ok(res, toSpaceDto(space), 'Espacio actualizado exitosamente');
};

// Cambio de estado del espacio (switch de estado) - para pagina Space.tsx.
export const toggleSpaceStatus = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const space = await SpaceService.toggleStatus(spacePublicId, req.validatedData, req.user!);
    return ApiResponse.ok(res, toSpaceDto(space), 'Estado actualizado');
};

/* ── Galería de archivos ───────────────────────────────────────── */
// Archivos de la galería del espacio — lista vacía si todavía no hay.
export const getGallery = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const files = await SpaceGalleryService.getGallery(spacePublicId, req.user!);
    return ApiResponse.ok(res, files.map(toMediaDto), 'Galería obtenida exitosamente');
};

// Sube un archivo a la galería del espacio.
export const uploadGalleryFile = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const file = await SpaceGalleryService.uploadGalleryFile(
        spacePublicId,
        req.file,
        req.user!,
        req.body?.description ?? null,
    );
    return ApiResponse.created(res, toMediaDto(file), 'Archivo agregado a la galería');
};

// Elimina un archivo de la galería del espacio (fila + físico).
export const removeGalleryFile = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const mediaPublicId = String(req.params.mediaPublicId);
    await SpaceGalleryService.removeGalleryFile(spacePublicId, mediaPublicId, req.user!);
    return ApiResponse.ok(res, null, 'Archivo eliminado de la galería');
};