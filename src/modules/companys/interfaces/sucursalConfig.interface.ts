/**
 * Contratos de payload de la configuración de sucursal — capa de entrada del service.
 *
 * Espeja `sucursalConfig.schema.ts`. `status` es de la sucursal (dsg_bss_company),
 * no de la config: si viene se actualiza en la misma transacción del upsert
 * (todo o nada).
 */

export type SucursalStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface SaveSucursalConfigInput {
    social_facebook?: string | null;
    social_instagram?: string | null;
    social_tiktok?: string | null;
    social_youtube?: string | null;
    social_whatsapp?: string | null;
    whatsapp_message?: string | null;
    opening_time?: string;
    closing_time?: string;
    min_price?: number | null;
    features?: string | null;
    status?: SucursalStatus;
}
