import type { Request, Response } from 'express';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';
import * as BookingAdminService from '../service/bookingAdmin.service';
import { toBookingDto } from '../dto/booking.dto';
import { NotFoundError } from '../../../shared/errors/CustomErrors';

// :bookingId de la ruta como entero positivo — cualquier otro valor es una reserva inexistente.
const parseBookingId = (value: string): number => {
    const id = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) throw new NotFoundError('Reserva no encontrada');
    return id;
};

export const create = async (req: Request, res: Response) => {
    const booking = await BookingAdminService.create(String(req.params.spacePublicId), req.validatedData, req.user!);
    return ApiResponse.created(res, toBookingDto(booking), 'Reserva manual registrada exitosamente');
};

export const registerPayment = async (req: Request, res: Response) => {
    const booking = await BookingAdminService.registerPayment(parseBookingId(String(req.params.bookingId)), req.validatedData, req.user!);
    return ApiResponse.created(res, toBookingDto(booking), 'Pago registrado exitosamente');
};

export const listBySpace = async (req: Request, res: Response) => {
    const { rows, count } = await BookingAdminService.listBySpace(String(req.params.spacePublicId), req.validatedQuery, req.user!);
    return ApiResponse.ok(res, rows.map(toBookingDto), 'Reservas obtenidas exitosamente', 200, {
        pagination: toPaginationMeta(count, req.validatedQuery),
    });
};
