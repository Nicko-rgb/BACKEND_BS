import { WebhookSignatureValidator, InvalidWebhookSignatureError } from 'mercadopago';
import sequelize from '../../../config/db';
import { PreApproval, client as mpClient } from '../../../config/mercadopago';
import * as SaaSSubscriptionRepository from '../repository/saasSubscription.repository';
import * as CompanyRepository from '../../companys/repository/company.repository';
import * as UserRepository from '../../users/repository/user.repository';
import { UnauthorizedError } from '../../../shared/errors/CustomErrors';
import logger from '../../../config/logger';

export interface WebhookNotification {
    dataId?: string;
    type?: string;
    xSignature?: string;
    xRequestId?: string;
}

// Cuántos días dura el trial antes del primer cobro automático — mismo valor que se manda
// en `auto_recurring.free_trial` al crear el Preapproval (ver saasCheckout.service.ts).
const TRIAL_DAYS = 7;

/**
 * Activa la suscripción y la empresa cuando MercadoPago confirma la autorización del
 * Preapproval (dueño cargó su tarjeta y aceptó el cobro recurrente). Idempotente: solo
 * encuentra la suscripción si sigue en PENDING, así que un reenvío del mismo webhook
 * (MercadoPago reintenta si no responde 2xx) no la vuelve a activar ni pisa nada.
 */
const activateTrialFromPreapproval = async (preapprovalId: string): Promise<void> => {
    let preapproval;
    try {
        preapproval = await new PreApproval(mpClient).get({ id: preapprovalId });
    } catch (err: any) {
        // 404 de MercadoPago (id inexistente — "Simular notificación" manda uno de ejemplo,
        // o el Preapproval real ya no existe) — se ignora, nunca se responde error por esto.
        logger.info(`[MP Webhook] Preapproval ${preapprovalId} no encontrado en MercadoPago — ignorado`, { status: err?.status });
        return;
    }

    if (preapproval.status !== 'authorized') {
        logger.info(`[MP Webhook] Preapproval ${preapprovalId} en estado "${preapproval.status}" — ignorado`);
        return;
    }

    const subscription = await SaaSSubscriptionRepository.findPendingByPreapprovalId(preapprovalId);
    if (!subscription) {
        logger.info(`[MP Webhook] No hay suscripción PENDING para el preapproval ${preapprovalId} — posiblemente ya activada`);
        return;
    }

    const companyId = subscription.subscriptionCompanies?.[0]?.company_id;
    if (!companyId) {
        logger.error(`[MP Webhook] Suscripción ${subscription.subscription_id} sin empresa vinculada`);
        return;
    }

    const company = await CompanyRepository.findByIdWithOwner(companyId);
    if (!company) {
        logger.error(`[MP Webhook] Empresa ${companyId} no encontrada para la suscripción ${subscription.subscription_id}`);
        return;
    }

    await sequelize.transaction(async (transaction) => {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

        await SaaSSubscriptionRepository.update(subscription, {
            status: 'TRIAL',
            current_period_start: now,
            current_period_end: trialEnd,
        }, transaction);

        await CompanyRepository.update(company, { is_enabled: 'A' }, transaction);

        const owner = company.userAssignments?.[0]?.user;
        if (owner) {
            await UserRepository.update(owner, { is_enabled: true }, transaction);
        }
    });

    logger.info(`[MP Webhook] Suscripción ${subscription.subscription_id} activada (trial hasta ${TRIAL_DAYS} días) por preapproval ${preapprovalId}`);
};

/**
 * Punto de entrada del webhook de MercadoPago. Verifica la firma (`MP_WEBHOOK_SECRET`) antes
 * de mirar el contenido — una firma inválida corta acá con `UnauthorizedError`, nunca se
 * confía en el payload sin verificar. Solo procesa `type: 'subscription_preapproval'` (alta
 * del trial); cualquier otro tipo de evento se ignora.
 *
 * El primer cobro automático que hace MercadoPago al terminar el trial (`type: 'payment'`,
 * factura + extensión de `current_period_end`) todavía no está implementado acá — recién se
 * puede probar contra un trial real vencido.
 */
export const handleWebhook = async ({ dataId, type, xSignature, xRequestId }: WebhookNotification): Promise<void> => {
    try {
        WebhookSignatureValidator.validate({
            xSignature,
            xRequestId,
            dataId,
            secret: process.env.MP_WEBHOOK_SECRET as string,
        });
    } catch (err) {
        if (err instanceof InvalidWebhookSignatureError) {
            logger.warn(`[MP Webhook] Firma inválida (${err.reason}) — request-id: ${err.requestId}`);
            throw new UnauthorizedError('Firma de webhook inválida');
        }
        throw err;
    }

    if (!dataId) {
        logger.info('[MP Webhook] Notificación sin data.id — ignorada');
        return;
    }

    if (type === 'subscription_preapproval') {
        await activateTrialFromPreapproval(dataId);
        return;
    }

    logger.info(`[MP Webhook] Evento ignorado: ${type}`);
};
