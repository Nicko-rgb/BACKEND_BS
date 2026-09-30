import type { Configuration } from '../database/models';

type SucursalStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

/**
 * Configuración de una sucursal para el frontend — solo `public_id` (nunca
 * `config_id`, `sucursal_id` ni `tenant_id`) más los 10 campos editables.
 * `status` es de la sucursal (dsg_bss_company), se incluye para precargar el
 * segmentado del tab Operativo.
 */
export const toSucursalConfigDto = (configuration: Configuration, status: SucursalStatus | null) => {
    return {
        publicId: configuration.public_id,
        socialFacebook: configuration.social_facebook,
        socialInstagram: configuration.social_instagram,
        socialTiktok: configuration.social_tiktok,
        socialYoutube: configuration.social_youtube,
        socialWhatsapp: configuration.social_whatsapp,
        whatsappMessage: configuration.whatsapp_message,
        openingTime: configuration.opening_time,
        closingTime: configuration.closing_time,
        minPrice: configuration.min_price,
        features: configuration.features,
        status,
    };
};
