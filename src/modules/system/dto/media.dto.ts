import type { Media } from '../database/models';

/**
 * Archivo para el frontend — solo `public_id` (nunca `media_id`, `medible_id`
 * ni `tenant_id`). `url` es la ruta relativa (/uploads/...) servida por el backend.
 *
 * `medible_type` identifica a qué entidad pertenece el archivo (Company,
 * Sucursal, Space, User…) — es libre en el modelo. Cada entidad tiene su
 * propio endpoint de media que fija su tipo internamente (ver
 * companys/service/sucursalBanner.service.ts y spaceGallery.service.ts), así
 * que el cliente nunca declara a qué entidad adjunta el archivo.
 */
export const toMediaDto = (media: Media) => {
    return {
        publicId: media.public_id,
        url: media.file_url,
        fileName: media.file_name,
        description: media.description,
        type: media.type,
        category: media.category,
        isPrimary: media.is_primary,
        medibleType: media.medible_type,
    };
};
