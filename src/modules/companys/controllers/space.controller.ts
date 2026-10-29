import type { Request, Response } from 'express';
import * as SpaceService from '../service/space.service';
import * as SpaceGalleryService from '../service/spaceGallery.service';
import { toSpaceDto } from '../dto/space.dto';
import { toMediaDto } from '../../system/dto/media.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Espacios deportivos de una sucursal.
export const listBySucursal = async (req: Request, res: Response) => {
    const sucursalPublicId = String(req.params.sucursalPublicId);
    const user = req.user;
    const rows = await SpaceService.listBySucursal(sucursalPublicId, user!);
    return ApiResponse.ok(res, rows.map(toSpaceDto), 'Espacios obtenidos exitosamente');
};

// Alta de un espacio deportivo bajo una sucursal - para pagina Sucursal.tsx.
export const registerSpace = async (req: Request, res: Response) => {
    const sucursalPublicId = String(req.params.sucursalPublicId);
    const data = req.validatedData;
    const user = req.user;
    const space = await SpaceService.register(sucursalPublicId, data, user!);
    return ApiResponse.created(res, toSpaceDto(space), 'Espacio registrado exitosamente');
};

// Detalle de un espacio deportivo - para pagina Sucursal.tsx.
export const spaceById = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const user = req.user;
    const space = await SpaceService.spaceById(spacePublicId, user!);
    return ApiResponse.ok(res, toSpaceDto(space), 'Información de espacio');
};

// Actualización de un espacio deportivo - para pagina Space.tsx.
export const updateSpace = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const data = req.validatedData;
    const user = req.user;
    const space = await SpaceService.update(spacePublicId, data, user!);
    return ApiResponse.ok(res, toSpaceDto(space), 'Espacio actualizado exitosamente');
};

// Cambio de estado del espacio (switch de estado) - para pagina Space.tsx.
export const toggleSpaceStatus = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const data = req.validatedData;
    const user = req.user;
    const space = await SpaceService.toggleStatus(spacePublicId, data, user!);
    return ApiResponse.ok(res, toSpaceDto(space), 'Estado actualizado');
};

/* ── Galería de archivos ───────────────────────────────────────── */
// Archivos de la galería del espacio — lista vacía si todavía no hay.
export const getGallery = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const user = req.user;
    const files = await SpaceGalleryService.getGallery(spacePublicId, user!);
    return ApiResponse.ok(res, files.map(toMediaDto), 'Galería obtenida exitosamente');
};

// Sube un archivo a la galería del espacio.
export const uploadGalleryFile = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const fileData = req.file;
    const user = req.user;
    const description = req.body.description;
    const file = await SpaceGalleryService.uploadGalleryFile( spacePublicId, fileData, user!, description, );
    return ApiResponse.created(res, toMediaDto(file), 'Archivo agregado a la galería');
};

// Elimina un archivo de la galería del espacio (fila + físico).
export const removeGalleryFile = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const mediaPublicId = String(req.params.mediaPublicId);
    const user = req.user;
    await SpaceGalleryService.removeGalleryFile(spacePublicId, mediaPublicId, user!);
    return ApiResponse.ok(res, null, 'Archivo eliminado de la galería');
};