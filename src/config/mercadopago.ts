/**
 * Cliente global de MercadoPago (fallback cuando una sucursal no tiene
 * credenciales propias conectadas — ver MercadoPagoCredential).
 */
import { MercadoPagoConfig, Payment, PreApproval } from 'mercadopago';

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN as string,
    options: { timeout: 10000 }
});

export { client, Payment, PreApproval };
