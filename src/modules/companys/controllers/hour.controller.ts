import type { Request, Response } from 'express';
import * as HourService from '../service/hour.service';
import { toHourDto } from '../dto/hour.dto';
import { BadRequestError } from '../../../shared/errors/CustomErrors';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Bloques de horario del espacio — lista completa, el front agrupa por día.
export const listHours = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const user = req.user;
    const rows = await HourService.list(spacePublicId, user!);
    return ApiResponse.ok(res, rows.map(toHourDto), 'Horarios obtenidos exitosamente');
};

/** hourId es el id interno (PK) — se sanea por si viene cualquier cosa. */
const parseHourId = (raw: string): number => {
    const hourId = Number(raw);
    if (!Number.isInteger(hourId) || hourId <= 0) throw new BadRequestError('Horario no válido');
    return hourId;
};

// Alta de un bloque de horario — para BussinesHour.tsx (modo registro).
export const registerHour = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const data = req.validatedData;
    const user = req.user;
    const hour = await HourService.register(spacePublicId, data, user!);0
    return ApiResponse.created(res, toHourDto(hour), 'Horario registrado exitosamente');
};

// Actualización de un bloque de horario — para BussinesHour.tsx (modo edición).
export const updateHour = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const hourId = parseHourId(String(req.params.hourId));
    const data = req.validatedData;
    const user = req.user;
    const hour = await HourService.update(spacePublicId, hourId, data, user!);
    return ApiResponse.ok(res, toHourDto(hour), 'Horario actualizado exitosamente');
};

// Habilita / deshabilita un bloque (is_closed) — bloquea el bloque, no el día.
export const toggleHourClosed = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const hourId = parseHourId(String(req.params.hourId));
    const user = req.user;
    const hour = await HourService.toggleClosed(spacePublicId, hourId, user!);
    return ApiResponse.ok(res, toHourDto(hour), hour.is_closed ? 'Bloque deshabilitado' : 'Bloque habilitado');
};
