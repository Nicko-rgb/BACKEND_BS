/**
 * Contratos de media — capa de contratos del módulo `system`.
 *
 * El vocabulario (tipos y categorías) vive acá y es la fuente de verdad: el
 * modelo Sequelize, el schema Joi y el service lo consumen desde este archivo.
 * Agregar un valor acá (la columna es VARCHAR, no hace falta migración) y Joi
 * + service lo toman solo.
 */

// Mapa central — única fuente de verdad.
export const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const MEDIA_CATEGORIES = ['GALLERY', 'PROFILE', 'COVER', 'THUMBNAIL', 'DOCUMENT'] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

/**
 * Payload de creación de un registro de media — el service `mediaCore.service.ts`
 * guarda la fila y el archivo; cada módulo resuelve su entidad y valida su scope
 * ANTES de llamar acá (ver `sucursalBanner.service.ts` como plantilla).
 */
export interface CreateRecordInput {
    medible_id: number;
    medible_type: string;
    tenant_id: string | null;
    category?: MediaCategory | string;
    type?: MediaType | string;
    is_primary?: boolean;
    /** true = elimina la primaria anterior (fila + físico) en vez de conservarla como historial. */
    replacePrevious?: boolean;
    description?: string | null;
    file: Express.Multer.File;
    user_id: number;
}
