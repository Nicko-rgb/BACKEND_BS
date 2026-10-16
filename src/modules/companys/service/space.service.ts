import * as CompanyRepository from '../repository/company.repository';
import * as SpaceRepository from '../repository/space.repository';
import * as SurfaceTypeRepository from '../../system/repository/surfaceType.repository';
import * as SportTypeRepository from '../../system/repository/sportType.repository';
import * as SportCategoryRepository from '../../system/repository/sportCategory.repository';
import * as PlanLimitsService from '../../saas/service/planLimits.service';
import { idPublicId } from '../../../shared/utils/ids';
import { assertCompanyScope } from '../../../shared/utils/accessScope';
import { BadRequestError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';

export interface RegisterSpaceInput {
    name: string;
    surface_type_id: number;
    sport_type_id: number;
    sport_category_id: number;
    capacity?: number | null;
    dimensions: string;
    equipment?: string | null;
    minimum_booking_minutes?: number;
    maximum_booking_minutes?: number;
}

/**
 * Espacios de una sucursal (por public_id) — con el mismo scope del alta:
 * system entra a cualquiera, otro rol solo si la sucursal está en su company_ids.
 */
export const listBySucursal = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(sucursalPublicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');

    assertCompanyScope(user, Number(sucursal.company_id), 'No tenés acceso a esta sucursal');
    return SpaceRepository.findBySucursalId(Number(sucursal.company_id));
};

/**
 * Alta de un espacio deportivo bajo una sucursal (por public_id).
 *   - Scope: system entra a cualquiera; otro rol solo si la sucursal está en
 *     su company_ids (mismo criterio que sucursal.service — el permiso lo
 *     exige la ruta con space.create, acá se valida a QUÉ sucursal).
 *   - Catálogos: superficie, tipo y categoría deben existir (tipo, además, activo).
 *   - Plan: maxSpaces por sucursal — cuenta los espacios de ESTA sucursal
 *     contra el plan de su empresa raíz.
 * Estado siempre ACTIVO al crear; auditoría con el usuario autenticado.
 */
export const register = async (sucursalPublicId: string, data: RegisterSpaceInput, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(sucursalPublicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');
    const sucursalId = Number(sucursal.company_id);

    assertCompanyScope(user, sucursalId, 'No tenés acceso a esta sucursal');

    const [surfaceType, sportType, sportCategory] = await Promise.all([
        SurfaceTypeRepository.findById(Number(data.surface_type_id)),
        SportTypeRepository.findById(Number(data.sport_type_id)),
        SportCategoryRepository.findById(Number(data.sport_category_id)),
    ]);
    if (!surfaceType) throw new NotFoundError('El tipo de superficie no existe');
    if (!sportType) throw new NotFoundError('El tipo de deporte no existe');
    if (!sportCategory) throw new NotFoundError('La categoría deportiva no existe');
    if (sportType.is_active === false) throw new BadRequestError('El tipo de deporte no está disponible actualmente');

    const rootId = Number(sucursal.parent_company_id ?? sucursal.company_id);
    const currentSpaces = await SpaceRepository.countBySucursalId(sucursalId);
    await PlanLimitsService.assertPlanLimit(rootId, 'maxSpaces', currentSpaces);

    return SpaceRepository.create({
        sucursal_id: sucursalId,
        tenant_id: sucursal.tenant_id,
        public_id: idPublicId(),
        name: data.name.trim(),
        surface_type_id: Number(data.surface_type_id),
        sport_type_id: Number(data.sport_type_id),
        sport_category_id: Number(data.sport_category_id),
        status_space: 'ACTIVE',
        description: null,
        capacity: data.capacity ?? null,
        dimensions: data.dimensions.trim(),
        equipment: data.equipment?.trim() || null,
        minimum_booking_minutes: data.minimum_booking_minutes ?? 60,
        maximum_booking_minutes: data.maximum_booking_minutes ?? 480,
        user_create: user.user_id,
        user_update: null,
    });
};
