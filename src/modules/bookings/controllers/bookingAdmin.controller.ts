import type { Request, Response } from 'express';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';
import * as BookingAdminService from '../service/bookingAdmin.service';
import { toBookingDto } from '../dto/booking.dto';

export const create = async (req: Request, res: Response) => {
    const booking = await BookingAdminService.create(String(req.params.spacePublicId), req.validatedData, req.user!);
    return ApiResponse.created(res, toBookingDto(booking), 'Reserva manual registrada exitosamente');
};

export const listBySpace = async (req: Request, res: Response) => {
    const { rows, count } = await BookingAdminService.listBySpace(String(req.params.spacePublicId), req.validatedQuery, req.user!);
    return ApiResponse.ok(res, rows.map(toBookingDto), 'Reservas obtenidas exitosamente', 200, {
        pagination: toPaginationMeta(count, req.validatedQuery),
    });
};
