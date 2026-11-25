import { toMediaDto } from '../../system/dto/media.dto';
import type { MercadoPagoCredential } from '../database/models';

/**
 * Credencial de Mercado Pago para el frontend.
 *
 * Nunca expone `access_token_encrypted`, `refresh_token_encrypted` ni
 * `tenant_id`/`sucursal_id`. Alcanza con saber el ambiente y cuándo se conectó.
 */
export const toMercadoPagoCredentialDto = (credential: MercadoPagoCredential) => ({
    environment: credential.environment,
    publicKey: credential.public_key,
    isActive: credential.is_active,
    connectedAt: credential.connected_at,
});

export const toManualPaymentAccountDto = (account: import('../database/models').PaymentAccount) => ({
    paymentTypeId: account.payment_type_id,
    account_name: account.account_name,
    account_number: account.account_number,
    account_alias: account.account_alias,
    qr_url: account.qr_url,
    qr: account.qr ? toMediaDto(account.qr) : null,
    bank_name: account.bank_name,
    isActive: account.is_active,
});
