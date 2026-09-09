import type { Request, Response } from 'express';
import * as SaaSWebhookService from '../service/saasWebhook.service';
import ApiResponse from '../../../shared/utils/ApiResponse';

// Recibe la notificación de MercadoPago (Preapproval autorizado) — endpoint público, sin
// verificarTokenAuth: MercadoPago no manda el JWT del panel, la autenticidad se valida por
// firma (x-signature) dentro del service.
export const handleMercadoPagoWebhook = async (req: Request, res: Response) => {
    await SaaSWebhookService.handleWebhook({
        dataId: req.query['data.id'] as string | undefined,
        type: (req.query.type as string | undefined) ?? req.body?.type,
        xSignature: req.headers['x-signature'] as string | undefined,
        xRequestId: req.headers['x-request-id'] as string | undefined,
    });

    return ApiResponse.ok(res, null, 'OK');
};
