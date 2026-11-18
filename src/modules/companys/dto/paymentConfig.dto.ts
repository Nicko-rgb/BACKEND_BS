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
