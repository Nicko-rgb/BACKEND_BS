/**
 * Contratos de entrada de Configuración de pagos.
 *
 * Espeja `paymentConfig.schema.ts`. Solo los campos que se registran desde el
 * panel: el access token viaja en claro y se encripta antes de guardarlo.
 */

export type MpEnvironment = 'SANDBOX' | 'PRODUCTION';

export interface RegisterMercadoPagoCredentialInput {
    access_token: string;
    public_key?: string | null;
    environment?: MpEnvironment;
}
