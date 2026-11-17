import type { Request, Response } from 'express';
import * as PaymentTypeService from '../service/paymentType.service';
import { toPaymentTypeDto } from '../dto/paymentType.dto';
import { BadRequestError } from '../../../shared/errors/CustomErrors';
import ApiResponse from '../../../shared/utils/ApiResponse';
import { toPaginationMeta } from '../../../shared/utils/paginate';

// Carga todos los metodos de pago para system
export const list = async (req: Request, res: Response) => {
    const { rows, count, referencesCount } = await PaymentTypeService.list(req.validatedQuery);
    const pagination = toPaginationMeta(count, req.validatedQuery);
    return ApiResponse.ok(res, rows.map((row) => toPaymentTypeDto(row, referencesCount[row.payment_type_id] ?? 0)), 'Tipos de pago obtenidos', 200, { pagination });
};

// Carga solo metodos de pagos activos para logica de negocio
export const listActive = async (_req: Request, res: Response) => {
    const rows = await PaymentTypeService.listActive();
    return ApiResponse.ok(res, rows.map((row) => toPaymentTypeDto(row)), 'Tipos de pago activos');
};

export const listActiveByCountry = async (req: Request, res: Response) => {
    const countryId = Number(req.params.countryId);
     if (!Number.isSafeInteger(countryId) || countryId <= 0) {
        throw new BadRequestError('País inválido');
    }
    const rows = await PaymentTypeService.listActiveByCountry(countryId);
    return ApiResponse.ok(res, rows.map((row) => toPaymentTypeDto(row)), 'Tipos de pago por país');
};

// Crea un nuevo metodo depago
export const create = async (req: Request, res: Response) => {
    const result = await PaymentTypeService.create(req.validatedData);
    return ApiResponse.created(res, toPaymentTypeDto(result), 'Tipo de pago creado');
};

// Actualiza un metodo de pago
export const update = async (req: Request, res: Response) => {
    const result = await PaymentTypeService.update(Number(req.params.id), req.validatedData);
    return ApiResponse.ok(res, toPaymentTypeDto(result), 'Tipo de pago actualizado');
};

// Elimina un metodo de pago
export const remove = async (req: Request, res: Response) => {
    await PaymentTypeService.remove(Number(req.params.id));
    return ApiResponse.ok(res, null, 'Tipo de pago eliminado');
};
