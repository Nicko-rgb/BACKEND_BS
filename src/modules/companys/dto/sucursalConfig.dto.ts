import type { Configuration } from '../database/models';

/**
 * Configuración de una sucursal para el frontend — solo `public_id` (nunca
 * `config_id`, `sucursal_id` ni `tenant_id`) más los campos editables.
 *
 * El estado de la sucursal NO va acá: vive en dsg_bss_company y se expone en el
 * detalle de la sucursal (sucursal.dto.ts), no en su configuración.
 */
export const toSucursalConfigDto = (configuration: Configuration) => {
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
    };
};
