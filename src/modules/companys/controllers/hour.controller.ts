import type { Request, Response } from 'express';
import * as HourService from '../service/hour.service';
import { toHourDto } from '../dto/hour.dto';
import { BadRequestError } from '../../../shared/errors/CustomErrors';
import { DAYS_OF_WEEK, type DayOfWeek, type HourDayPublic } from '../interfaces/hour.interface';
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

// Guarda la semana completa del espacio — crea o reemplaza TODOS sus bloques.
export const saveSchedule = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const data = req.validatedData;
    const user = req.user;
    const rows = await HourService.replaceSchedule(spacePublicId, data, user!);
    return ApiResponse.ok(res, rows.map(toHourDto), 'Horarios guardados exitosamente');
};

// Habilita / deshabilita un bloque (is_closed) — bloquea el bloque, no el día.
export const toggleHourClosed = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const hourId = parseHourId(String(req.params.hourId));
    const user = req.user;
    const hour = await HourService.toggleClosed(spacePublicId, hourId, user!);
    return ApiResponse.ok(res, toHourDto(hour), hour.is_closed ? 'Bloque deshabilitado' : 'Bloque habilitado');
};

/**
 * El día llega crudo en la URL — se normaliza a mayúsculas ('monday' → 'MONDAY')
 * y se valida contra el ENUM de la BD antes de tocar el service.
 */
const parseDay = (raw: string): DayOfWeek => {
    const day = raw.toUpperCase();
    if (!DAYS_OF_WEEK.includes(day as DayOfWeek)) throw new BadRequestError(`Día de la semana inválido: ${day}`);
    return day as DayOfWeek;
};

// Habilita / deshabilita un día entero (todos sus bloques) — para BussinesHour.tsx.
export const toggleHourDay = async (req: Request, res: Response) => {
    const spacePublicId = String(req.params.spacePublicId);
    const day = parseDay(String(req.params.day));
    const user = req.user;
    const rows = await HourService.toggleDayClosed(spacePublicId, day, user!);

    // El estado del día sale de las filas ya actualizadas (todas quedan iguales).
    const isClosed = rows.every((row) => row.is_closed);
    const dayResult: HourDayPublic = { day, isClosed, hours: rows.map(toHourDto) };

    return ApiResponse.ok(res, dayResult, isClosed ? 'Día deshabilitado' : 'Día habilitado');
};
