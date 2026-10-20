/**
 * Core de media — mecánica compartida sin reglas de negocio.
 *
 * Guarda filas en dsg_bss_media y archivos en disco, sin saber qué es una
 * sucursal, un espacio o un usuario: cada módulo resuelve su entidad y valida
 * su scope ANTES de llamar acá (ver sucursalBanner.service.ts como plantilla),
 * y le pasa ids internos ya verificados. Los services de módulo NUNCA tocan
 * MediaRepository directo — siempre por acá, para que el manejo de primaria
 * anterior y el borrado físico no se dupliquen (y no diverjan) por módulo.
 */
import fs from 'fs';
import path from 'path';
import type { Transaction } from 'sequelize';
import { idPublicId } from '../../../shared/utils/ids';
import sequelize from '../../../config/db';
import logger from '../../../config/logger';
import * as MediaRepository from '../repository/media.repository';
import { buildFileUrl } from '../../../shared/middlewares/uploadMiddleware';
import { BadRequestError } from '../../../shared/errors/CustomErrors';
import type { Media } from '../database/models/Media';
import type { CreateRecordInput, MediaCategory, MediaType } from '../interfaces/media.interface';
import { MEDIA_CATEGORIES, MEDIA_TYPES } from '../interfaces/media.interface';

export const typeFromMimetype = (mimetype: string): MediaType => {
    if (mimetype.startsWith('image/')) return 'IMAGE';
    if (mimetype.startsWith('video/')) return 'VIDEO';
    if (mimetype.startsWith('audio/')) return 'AUDIO';
    return 'DOCUMENT';
};

// file_url (/uploads/...) → ruta en disco. Best-effort: si el archivo ya no está,
// se loguea y se sigue con el borrado de la fila.
const removePhysicalFile = (fileUrl: string | null): void => {
    if (!fileUrl) return;
    const relative = fileUrl.replace(/^\/uploads\//, '');
    const diskPath = path.join(__dirname, '..', '..', '..', '..', 'uploads', relative);
    try {
        if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
    } catch (err) {
        logger.warn(`[MediaCore] No se pudo borrar el archivo ${diskPath}`, { error: err });
    }
};

// Crea la fila + desmarca la primaria anterior del mismo (medible, categoría).
// Si no viene transacción, abre una propia para que unset + create sean atómicos.
export const createRecord = async (input: CreateRecordInput, transaction?: Transaction) => {
    const fileUrl = buildFileUrl(input.file);
    if (!fileUrl) throw new BadRequestError('No se pudo resolver la URL del archivo');

    const category = (input.category || 'GALLERY') as MediaCategory;
    if (!(MEDIA_CATEGORIES as readonly string[]).includes(category)) {
        throw new BadRequestError('Categoría de archivo no válida');
    }
    const type = (input.type || typeFromMimetype(input.file.mimetype)) as MediaType;
    if (!(MEDIA_TYPES as readonly string[]).includes(type)) {
        throw new BadRequestError('Tipo de archivo no válido');
    }
    const isPrimary = input.is_primary ?? false;

    const run = async (t?: Transaction) => {
        if (isPrimary) {
            if (input.replacePrevious) {
                const previous = await MediaRepository.findPrimary(input.medible_id, input.medible_type, category, t);
                if (previous) await removeRecord(previous, t);
            } else {
                await MediaRepository.unsetPrimary(input.medible_id, input.medible_type, category, t);
            }
        }
        return MediaRepository.create({
            medible_id: input.medible_id,
            medible_type: input.medible_type,
            tenant_id: input.tenant_id,
            type,
            category,
            file_url: fileUrl,
            file_name: input.file.originalname,
            description: input.description || null,
            is_primary: isPrimary,
            public_id: idPublicId(),
            user_create: input.user_id,
            user_update: null,
        }, t);
    };

    if (transaction) return run(transaction);
    return sequelize.transaction((t) => run(t));
};

// Borra el físico (best-effort) + la fila, a partir de la instancia ya resuelta.
export const removeRecord = async (media: Media, transaction?: Transaction) => {
    removePhysicalFile(media.file_url);
    await MediaRepository.remove(media, transaction);
};
