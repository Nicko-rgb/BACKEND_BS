/**
 * Galería multimedia del espacio — endpoints finos del módulo companys sobre el
 * core global de media (system/service/mediaCore.service.ts).
 *
 * Mismo criterio que la portada de la sucursal (sucursalBanner.service.ts): la
 * autorización real es la PERTENENCIA — el espacio tiene que estar dentro del
 * alcance del usuario (su sucursal en company_ids). La mecánica (validación de
 * type, archivo físico, primaria) vive en el core; acá solo se resuelve el
 * espacio y su scope.
 *
 * A diferencia de la portada (que reemplaza), la galería ACUMULA archivos.
 */
import * as SpaceRepository from '../repository/space.repository';
import * as MediaRepository from '../../system/repository/media.repository';
import * as MediaCore from '../../system/service/mediaCore.service';
import { assertCompanyScope } from '../../../shared/utils/accessScope';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';

/** Categoría de media de la galería (ver MEDIA_CATEGORIES en system/interfaces/media.interface.ts). */
const GALLERY_CATEGORY = 'GALLERY';

/** medible_type del espacio (ver associations en system/database/models/Media.ts). */
const MEDIBLE_TYPE = 'Space';

/**
 * Resuelve el espacio por public_id y valida que esté dentro del alcance del
 * usuario — el scope se evalúa sobre la sucursal a la que pertenece el espacio.
 */
const resolveSpace = async (spacePublicId: string, user: AuthenticatedUser) => {
    const spaceId = await SpaceRepository.getSpaceIdByPublicId(spacePublicId);
    if (!spaceId) throw new NotFoundError('Espacio deportivo no encontrado');

    const space = await SpaceRepository.findById(spaceId);
    if (!space) throw new NotFoundError('Espacio deportivo no encontrado');

    assertCompanyScope(user, space.sucursal_id, 'No tenés acceso a este espacio');
    return space;
};

/**
 * Archivos de la galería del espacio — lista vacía si todavía no subió ninguno.
 */
export const getGallery = async (spacePublicId: string, user: AuthenticatedUser) => {
    const space = await resolveSpace(spacePublicId, user);
    return MediaRepository.findByMedibleAndCategory(Number(space.space_id), MEDIBLE_TYPE, GALLERY_CATEGORY);
};

/**
 * Sube un archivo a la galería del espacio (imagen o video). No marca primaria
 * ni reemplaza el anterior — la galería acumula.
 */
export const uploadGalleryFile = async (
    spacePublicId: string,
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
    description?: string | null,
) => {
    if (!file) throw new BadRequestError('Archivo requerido');
    const space = await resolveSpace(spacePublicId, user);

    return MediaCore.createRecord({
        medible_id: Number(space.space_id),
        medible_type: MEDIBLE_TYPE,
        tenant_id: space.tenant_id,
        category: GALLERY_CATEGORY,
        is_primary: false,
        description: description ?? null,
        file,
        user_id: user.user_id,
    });
};

/**
 * Elimina un archivo de la galería (fila + archivo físico).
 *
 * El archivo se busca por su public_id y se verifica que sea de ESTE espacio:
 * sin ese chequeo, un usuario con acceso a un espacio podría borrar el
 * archivo de otro espacio pasando su public_id.
 */
export const removeGalleryFile = async (
    spacePublicId: string,
    mediaPublicId: string,
    user: AuthenticatedUser,
) => {
    const space = await resolveSpace(spacePublicId, user);

    const media = await MediaRepository.findByPublicId(mediaPublicId);
    if (!media) throw new NotFoundError('El archivo no existe');

    const belongsToSpace = Number(media.medible_id) === Number(space.space_id)
        && media.medible_type === MEDIBLE_TYPE
        && media.category === GALLERY_CATEGORY;
    if (!belongsToSpace) {
        throw new ForbiddenError('El archivo no pertenece a la galería de este espacio');
    }

    await MediaCore.removeRecord(media);
};
