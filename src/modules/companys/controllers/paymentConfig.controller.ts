import type { Request, Response } from 'express';
import * as PaymentConfigService from '../service/paymentConfig.service';
import { toMercadoPagoCredentialDto } from '../dto/paymentConfig.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Registro de la credencial de Mercado Pago de una sucursal.
export const registerMercadoPagoCredential = async (req: Request, res: Response) => {
    const sucursalPublicId = String(req.params.sucursalPublicId);
    const data = req.validatedData;
    const user = req.user;
    const { credential } = await PaymentConfigService.registerMercadoPagoCredential(sucursalPublicId, data, user!);
    return ApiResponse.ok(res, toMercadoPagoCredentialDto(credential), 'Mercado Pago conectado');
};

// Solo estado: ¿la sucursal tiene Mercado Pago conectado?
export const getMercadoPagoStatus = async (req: Request, res: Response) => {
    const sucursalPublicId = String(req.params.sucursalPublicId);
    const { connected } = await PaymentConfigService.getMercadoPagoStatus(sucursalPublicId, req.user!);
    return ApiResponse.ok(res, { connected }, 'Estado de Mercado Pago obtenido');
};

// Desconecta la cuenta: borra la credencial de la sucursal.
export const disconnectMercadoPagoCredential = async (req: Request, res: Response) => {
    const sucursalPublicId = String(req.params.sucursalPublicId);
    await PaymentConfigService.disconnectMercadoPagoCredential(sucursalPublicId, req.user!);
    return ApiResponse.ok(res, null, 'Mercado Pago desconectado');
};
