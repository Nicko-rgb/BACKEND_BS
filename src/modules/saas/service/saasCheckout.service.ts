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
 * En desarrollo, MercadoPago solo acepta como `payer_email` una cuenta de prueba propia
 * (rechaza cualquier email real con "Both payer and collector must be real or test users",
 * porque el `MP_ACCESS_TOKEN` de sandbox es una cuenta de prueba) — `MP_TEST_PAYER_EMAIL`
 * la reemplaza solo para esta llamada. El dueño real igual recibe el mail de aviso a su
 * propio correo (ver notification.service.ts) — son dos destinatarios distintos a propósito.
 * En producción nunca se reemplaza, sea cual sea el valor de esta env var.
 */
const resolvePayerEmail = (ownerEmail: string): string => {
    if (process.env.NODE_ENV === 'development' && process.env.MP_TEST_PAYER_EMAIL) {
        return process.env.MP_TEST_PAYER_EMAIL;
    }
    return ownerEmail;
};

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

    const mpPayerEmail = resolvePayerEmail(payerEmail);

    let response;
    try {
        response = await new PreApproval(mpClient).create({
            body: {
                reason: `${plan.name} — ${billingPeriod === 'yearly' ? 'Anual' : 'Mensual'}`,
                payer_email: mpPayerEmail,
                external_reference: String(subscription.subscription_id),
                back_url: process.env.FRONT_ADMIN_BOOKING || 'http://localhost:3000',
                auto_recurring: autoRecurring as any,
            },
        });
    } catch (mpError: any) {
        logger.error(`[MP Preapproval] Error creando link de pago para subscription_id=${subscription.subscription_id}`, {
            status: mpError?.status,
            message: mpError?.message,
            cause: mpError?.cause,
            apiResponse: mpError?.apiResponse,
            requestSent: { payer_email: mpPayerEmail, auto_recurring: autoRecurring },
        });
        throw new BadRequestError('No se pudo generar el link de pago con MercadoPago.');
    }

    if (!response?.id || !response?.init_point) {
        throw new BadRequestError('MercadoPago no devolvió un link de pago válido.');
    }

    await SaaSSubscriptionRepository.update(subscription, { mp_preapproval_id: response.id });

    return response.init_point;
};
