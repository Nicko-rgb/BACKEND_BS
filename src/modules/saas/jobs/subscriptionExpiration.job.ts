import cron from 'node-cron';
import logger from '../../../config/logger';
import * as SaaSSubscriptionRepository from '../repository/saasSubscription.repository';
import { toErrorMessage } from '../../../shared/utils/errorUtils';

const cronExpression = '0 0 * * *';

if (!cron.validate(cronExpression)) {
    throw new Error(`[SubscriptionExpiration] Expresión cron inválida: "${cronExpression}" (SUBSCRIPTION_EXPIRATION_CRON)`);
}

/** Corre al arrancar y cada noche media noche; devuelve la tarea para el graceful shutdown. */
export const startSubscriptionExpiration = () => {
    let running = false;

    const run = async () => {
        if (running) return;
        running = true;
        try {
            const expired = await SaaSSubscriptionRepository.expireEffectiveSubscriptions();
            if (expired > 0) logger.info(`[SubscriptionExpiration] ${expired} suscripción(es) vencida(s)`);
        } catch (error: unknown) {
            logger.error('[SubscriptionExpiration] No se pudo actualizar la vigencia', { error: toErrorMessage(error) });
        } finally {
            running = false;
        }
    };

    void run();
    return cron.schedule(cronExpression, () => { void run(); });
};
