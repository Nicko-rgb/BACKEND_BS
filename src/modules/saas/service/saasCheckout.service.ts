import { PreApproval, client as mpClient } from '../../../config/mercadopago';
import * as SaaSSubscriptionRepository from '../repository/saasSubscription.repository';
import { BadRequestError } from '../../../shared/errors/CustomErrors';
import logger from '../../../config/logger';
import type { SaaSSubscription } from '../database/models';
import type { SaaSPlan } from '../database/models';
import type { Country } from '../../system/database/models';

/**
 * Frecuencia de cobro para MercadoPago según el período elegido — MercadoPago no tiene
 * `frequency_type: 'years'`, un plan anual se factura cada 12 meses.
 */
const billingPeriodToRecurring = (billingPeriod: string) => (
    billingPeriod === 'yearly' ? { frequency: 12, frequency_type: 'months' } : { frequency: 1, frequency_type: 'months' }
);

/**
 * Crea la suscripción (Preapproval) en MercadoPago con 7 días de prueba gratis — no cobra
 * nada hasta que el trial termina, recién ahí empieza a cobrar solo según `auto_recurring`.
 * Sin `card_token_id`: MercadoPago devuelve un `init_point`, la URL de un checkout propio
 * donde el dueño carga su tarjeta — nunca pasa por este backend.
 *
 * Guarda el `mp_preapproval_id` en la suscripción (ya en estado PENDING desde el alta) para
 * que el webhook pueda encontrarla cuando MercadoPago confirme la autorización.
 */
export const createPaymentLink = async (
    subscription: SaaSSubscription,
    plan: SaaSPlan,
    billingPeriod: string,
    payerEmail: string,
    country: Country
): Promise<string> => {
    const transactionAmount = Number(billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly);

    // `PreApprovalRequest.auto_recurring` del SDK no tipa `free_trial` (queda solo en el tipo
    // interno `AutoRecurringWithFreeTrial`, no exportado) aunque la API real sí lo acepta —
    // se arma acá aparte y se castea al mandarlo.
    const autoRecurring = {
        ...billingPeriodToRecurring(billingPeriod),
        transaction_amount: transactionAmount,
        currency_id: country.iso_currency,
        free_trial: { frequency: 7, frequency_type: 'days' },
    };

    let response;
    try {
        response = await new PreApproval(mpClient).create({
            body: {
                reason: `${plan.name} — ${billingPeriod === 'yearly' ? 'Anual' : 'Mensual'}`,
                payer_email: payerEmail,
                external_reference: String(subscription.subscription_id),
                back_url: process.env.FRONT_ADMIN_BOOKING || 'http://localhost:3000',
                auto_recurring: autoRecurring as any,
            },
        });
    } catch (mpError: any) {
        const cause = mpError?.cause ?? mpError?.message ?? mpError;
        logger.error(`[MP Preapproval] Error creando link de pago para subscription_id=${subscription.subscription_id}`, { error: cause });
        throw new BadRequestError('No se pudo generar el link de pago con MercadoPago.');
    }

    if (!response?.id || !response?.init_point) {
        throw new BadRequestError('MercadoPago no devolvió un link de pago válido.');
    }

    await SaaSSubscriptionRepository.update(subscription, { mp_preapproval_id: response.id });

    return response.init_point;
};
