import type { Request, Response } from 'express';
import * as SubscriptionService from '../service/subscription.service';
import { toSubscriptionDto } from '../dto/subscription.dto';
import ApiResponse from '../../../shared/utils/ApiResponse';

export const getDetail = async (req: Request, res: Response) => {
    const companyPublicId = String(req.params.companyPublicId);
    const user = req.user!;
    const { subscription, primaryCompany } = await SubscriptionService.getSubscription(companyPublicId, user);
    const data = toSubscriptionDto(subscription, primaryCompany);
    return ApiResponse.ok(res, data, 'Suscripción obtenida exitosamente');
};
