/**
 * Portada de sucursal — endpoints finos del módulo companys sobre el core
 * global de media (system/service/mediaCore.service.ts).
 *
 * Sin verificarPermiso a propósito: solo auth + pertenencia (la sucursal debe
 * estar en el company_ids del usuario). La mecánica (primaria anterior,
 * físico, validación de type) vive en el core — acá solo se resuelve la
 * sucursal y su scope.
 */
import * as CompanyRepository from '../repository/company.repository';
import * as MediaRepository from '../../system/repository/media.repository';
import * as MediaCore from '../../system/service/mediaCore.service';
import { assertCompanyScope } from '../../../shared/utils/accessScope';
import { BadRequestError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';

const BANNER_CATEGORY = 'COVER';
const MEDIBLE_TYPE = 'Sucursal';

const resolveSucursal = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(sucursalPublicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');

    assertCompanyScope(user, sucursal.company_id, 'No tenés acceso a esta sucursal');
    return sucursal;
};

// Portada actual (primaria de la categoría COVER) — null si no hay.
export const getBanner = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await resolveSucursal(sucursalPublicId, user);
    return MediaRepository.findPrimary(sucursal.company_id, MEDIBLE_TYPE, BANNER_CATEGORY);
};

// Sube y marca como primaria — reemplaza la anterior (fila + físico), no acumula historial.
export const uploadBanner = async (sucursalPublicId: string, file: Express.Multer.File | undefined, user: AuthenticatedUser, description?: string | null) => {
    if (!file) throw new BadRequestError('Archivo requerido');
    const sucursal = await resolveSucursal(sucursalPublicId, user);

    return MediaCore.createRecord({
        medible_id: sucursal.company_id,
        medible_type: MEDIBLE_TYPE,
        tenant_id: sucursal.tenant_id,
        category: BANNER_CATEGORY,
        is_primary: true,
        replacePrevious: true,
        description: description || null,
        file,
        user_id: user.user_id,
    });
};

// Elimina la portada actual (físico + fila).
export const removeBanner = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await resolveSucursal(sucursalPublicId, user);
    const banner = await MediaRepository.findPrimary(Number(sucursal.company_id), MEDIBLE_TYPE, BANNER_CATEGORY);
    if (!banner) throw new NotFoundError('La sucursal no tiene portada');

    await MediaCore.removeRecord(banner);
};
