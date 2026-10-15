/**
 * Media global (system) — registro de archivos para cualquier módulo.
 *
 * Los módulos no tocan dsg_bss_media directo: le pasan a este service el
 * medible (tipo + public_id) y el archivo, y acá se resuelve el id interno,
 * el tenant y el scope. Soporta Company (empresa madre) y Sucursal; Space/User
 * se agregan extendiendo MEDIBLE_TYPES + resolveMedible (mismo patrón).
 *
 * `tenant_id` puede quedar NULL solo para assets globales sin entidad — hoy
 * todos los medibles soportados tienen tenant, así que siempre se hereda.
 */
import fs from 'fs';
import path from 'path';
import { idPublicId } from '../../../shared/utils/ids';
import sequelize from '../../../config/db';
import logger from '../../../config/logger';
import * as CompanyRepository from '../../companys/repository/company.repository';
import * as MediaRepository from '../repository/media.repository';
import { buildFileUrl } from '../../../shared/middlewares/uploadMiddleware';
import { hasFullCompanyAccess, assertCompanyScope } from '../../../shared/utils/accessScope';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import { MEDIA_CATEGORIES, MEDIA_TYPES } from '../database/models/Media';
import type { MediaCategory, MediaType } from '../database/models/Media';

export type SupportedMedibleType = 'Company' | 'Sucursal';

const MEDIBLE_TYPES: SupportedMedibleType[] = ['Company', 'Sucursal'];

export interface RegisterMediaInput {
    medible_type: SupportedMedibleType;
    medible_public_id: string;
    category?: MediaCategory;
    type?: MediaType;
    is_primary?: boolean;
    description?: string | null;
}

interface ResolvedMedible {
    medibleId: number;
    tenantId: string;
}

// public_id → id interno + tenant, con scope manual (mismo criterio que companys:
// system entra a cualquiera, otro rol solo si la entidad está en su company_ids).
const resolveMedible = async (medibleType: SupportedMedibleType, mediblePublicId: string, user: AuthenticatedUser): Promise<ResolvedMedible> => {
    const company = medibleType === 'Sucursal'
        ? await CompanyRepository.findSucursalByPublicId(mediblePublicId)
        : await CompanyRepository.findByPublicId(mediblePublicId);

    if (!company) throw new NotFoundError(`${medibleType === 'Sucursal' ? 'Sucursal no encontrada' : 'Empresa no encontrada'}`);

    assertCompanyScope(user, Number(company.company_id), 'No tenés acceso a esta entidad');

    return { medibleId: Number(company.company_id), tenantId: company.tenant_id };
};

const typeFromMimetype = (mimetype: string): MediaType => {
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
        logger.warn(`[MediaService] No se pudo borrar el archivo ${diskPath}`, { error: err });
    }
};

export const listByMedible = async (medibleType: string, mediblePublicId: string, user: AuthenticatedUser) => {
    if (!(MEDIBLE_TYPES as string[]).includes(medibleType)) {
        throw new BadRequestError(`Tipo no soportado: ${medibleType}`);
    }
    const { medibleId } = await resolveMedible(medibleType as SupportedMedibleType, mediblePublicId, user);
    return MediaRepository.findByMedible(medibleId, medibleType);
};

export const register = async (file: Express.Multer.File | undefined, input: RegisterMediaInput, user: AuthenticatedUser) => {
    if (!(MEDIBLE_TYPES as string[]).includes(input.medible_type)) {
        throw new BadRequestError(`Tipo no soportado: ${input.medible_type}`);
    }
    if (!file) throw new BadRequestError('Archivo requerido');

    const { medibleId, tenantId } = await resolveMedible(input.medible_type, input.medible_public_id, user);

    const fileUrl = buildFileUrl(file);
    if (!fileUrl) throw new BadRequestError('No se pudo resolver la URL del archivo');

    const category: MediaCategory = input.category || 'GALLERY';
    if (!(MEDIA_CATEGORIES as readonly string[]).includes(category)) {
        throw new BadRequestError(`Categoría de archivo no válido`);
    }
    const type: MediaType = input.type || typeFromMimetype(file.mimetype);
    if (!(MEDIA_TYPES as readonly string[]).includes(type)) {
        throw new BadRequestError(`Tipo de archivo no válido`);
    }
    const isPrimary = input.is_primary ?? false;

    return sequelize.transaction(async (transaction) => {
        if (isPrimary) {
            await MediaRepository.unsetPrimary(medibleId, input.medible_type, category, transaction);
        }

        return MediaRepository.create({
            medible_id: medibleId,
            medible_type: input.medible_type,
            tenant_id: tenantId,
            type,
            category,
            file_url: fileUrl,
            file_name: file.originalname,
            description: input.description || null,
            is_primary: isPrimary,
            public_id: idPublicId(),
            user_create: user.user_id,
            user_update: null,
        }, transaction);
    });
};

export const remove = async (publicId: string, user: AuthenticatedUser) => {
    const media = await MediaRepository.findByPublicId(publicId);
    if (!media) throw new NotFoundError('Archivo no encontrado');

    // Scope por id interno de la entidad dueña (la fila ya trae medible_id/tenant).
    // Quien subió el archivo siempre puede borrarlo (cubre assets globales sin entidad).
    const isOwner = Number(media.user_create) === user.user_id;
    if (!isOwner) assertCompanyScope(user, Number(media.medible_id), 'No tenés acceso a este archivo');

    removePhysicalFile(media.file_url);
    await MediaRepository.remove(media);
};
