import { createRouter } from '../../../shared/utils/createRouter';
import { handleMercadoPagoWebhook } from '../controllers/webhook.controller';

const router = createRouter();

/**
 * @route POST /api/saas/webhooks/mercadopago
 * @desc  Notificación de MercadoPago (Preapproval autorizado) — activa la empresa.
 * @access público (verificado por firma x-signature, no por JWT)
 */
router.post('/webhooks/mercadopago', handleMercadoPagoWebhook);

export default router;
