/**
 * Contratos de payload de la configuración de sucursal — capa de entrada del service.
 *
 * Espeja `sucursalConfig.schema.ts`. El estado de la sucursal NO va acá (vive en
 * dsg_bss_company y tiene su propio endpoint).
 */

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
}
