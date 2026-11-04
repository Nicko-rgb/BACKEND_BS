/**
 * Contratos del ciclo de vida de una suscripción SaaS.
 */

export const SUBSCRIPTION_STATUSES = [
    'PENDING',
    'TRIAL',
    'ACTIVE',
    'PAST_DUE',
    'CANCELED',
    'INCOMPLETE',
] as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

/**
 * `auto_recurring` tal como lo acepta la API real de MercadoPago. El tipo público del SDK
 * no incluye `free_trial` aunque la API sí, así que se declara el shape completo acá para
 * no usar `as any` en `saasCheckout.service.ts`.
 */
export interface AutoRecurringWithFreeTrial {
    frequency: number;
    frequency_type: string;
    transaction_amount?: number;
    currency_id: string;
    free_trial?: { frequency: number; frequency_type: string };
}
