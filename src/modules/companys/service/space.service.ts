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
import type { RegisterSpaceInput, UpdateSpaceInput, SpaceUpdateData, SpaceStatusInput } from '../interfaces/space.interface';

/**
 * Espacios de una sucursal (por public_id) — con el mismo scope del alta:
 * system entra a cualquiera, otro rol solo si la sucursal está en su company_ids.
 */
export const listBySucursal = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(sucursalPublicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');

    assertCompanyScope(user, sucursal.company_id, 'No tenés acceso a esta sucursal');
    return SpaceRepository.findBySucursalId(sucursal.company_id);
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
    const sucursalId = sucursal.company_id;

    assertCompanyScope(user, sucursalId, 'No tenés acceso a esta sucursal');

    const [surfaceType, sportType, sportCategory] = await Promise.all([
        SurfaceTypeRepository.findById(data.surface_type_id),
        SportTypeRepository.findById(data.sport_type_id),
        SportCategoryRepository.findById(data.sport_category_id),
    ]);
    if (!surfaceType) throw new NotFoundError('El tipo de superficie no existe');
    if (!sportType) throw new NotFoundError('El tipo de deporte no existe');
    if (!sportCategory) throw new NotFoundError('La categoría deportiva no existe');
    if (sportType.is_active === false) throw new BadRequestError('El tipo de deporte no está disponible actualmente');

    const rootId = sucursal.parent_company_id ?? sucursal.company_id;
    const currentSpaces = await SpaceRepository.countBySucursalId(sucursalId);
    await PlanLimitsService.assertPlanLimit(rootId, 'maxSpaces', currentSpaces);

    return SpaceRepository.create({
        sucursal_id: sucursalId,
        tenant_id: sucursal.tenant_id,
        public_id: idPublicId(),
        name: data.name.trim(),
        surface_type_id: data.surface_type_id,
        sport_type_id: data.sport_type_id,
        sport_category_id: data.sport_category_id,
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

/**
 * Actualización de un espacio deportivo por public_id.
 *   - Scope: system entra a cualquiera; otro rol solo si la sucursal del espacio
 *     está en su company_ids (verifica pertenencia via space.sucursal_id).
 *   - Catálogos: si se envían IDs nuevos, deben existir (tipo, además, activo).
 *   - No permite cambiar sucursal ni tenant (datos de auditoría: user_update).
 */
export const update = async (spacePublicId: string, data: UpdateSpaceInput, user: AuthenticatedUser) => {
    // 1. Resolver espacio y validar scope sobre SU sucursal
    const spaceId = await SpaceRepository.getSpaceIdByPublicId(spacePublicId);
    if (!spaceId) throw new NotFoundError('Espacio deportivo no encontrado');

    const space = await SpaceRepository.findById(spaceId);
    if (!space) throw new NotFoundError('Espacio deportivo no encontrado');

    assertCompanyScope(user, space.sucursal_id, 'No tenés acceso a este espacio');

    // 2. Validar catálogos solo si vienen en el payload
    if (data.surface_type_id != null) {
        const surfaceType = await SurfaceTypeRepository.findById(data.surface_type_id);
        if (!surfaceType) throw new NotFoundError('El tipo de superficie no existe');
    }
    if (data.sport_type_id != null) {
        const sportType = await SportTypeRepository.findById(data.sport_type_id);
        if (!sportType) throw new NotFoundError('El tipo de deporte no existe');
        if (sportType.is_active === false) throw new BadRequestError('El tipo de deporte no está disponible actualmente');
    }
    if (data.sport_category_id != null) {
        const sportCategory = await SportCategoryRepository.findById(data.sport_category_id);
        if (!sportCategory) throw new NotFoundError('La categoría deportiva no existe');
    }

    // 3. Validar coherencia min/max:
    // - Joi ya valida max > min cuando AMBOS vienen juntos (schema.updateSpaceSchema).
    // - Aquí validamos cuando SOLO VIENE UNO (cruza con el valor actual en BD).
    if (data.minimum_booking_minutes != null && data.maximum_booking_minutes != null) {
        if (data.maximum_booking_minutes <= data.minimum_booking_minutes) {
            throw new BadRequestError('El máximo de reserva debe ser mayor al mínimo');
        }
    } else if (data.minimum_booking_minutes != null && data.maximum_booking_minutes == null) {
        if (space.maximum_booking_minutes <= data.minimum_booking_minutes) {
            throw new BadRequestError('El máximo de reserva debe ser mayor al mínimo');
        }
    } else if (data.maximum_booking_minutes != null && data.minimum_booking_minutes == null) {
        if (data.maximum_booking_minutes <= space.minimum_booking_minutes) {
            throw new BadRequestError('El máximo de reserva debe ser mayor al mínimo');
        }
    }

    // 4. Preparar datos de actualización (solo campos permitidos, sin sucursal_id/tenant_id/public_id/user_create)
    const updateData: SpaceUpdateData = { user_update: user.user_id };
    if (data.name != null) updateData.name = data.name.trim();
    if (data.surface_type_id != null) updateData.surface_type_id = data.surface_type_id;
    if (data.sport_type_id != null) updateData.sport_type_id = data.sport_type_id;
    if (data.sport_category_id != null) updateData.sport_category_id = data.sport_category_id;
    if (data.capacity != null) updateData.capacity = data.capacity;
    if (data.dimensions != null) updateData.dimensions = data.dimensions.trim();
    if (data.equipment != null) updateData.equipment = data.equipment.trim() || null;
    if (data.minimum_booking_minutes != null) updateData.minimum_booking_minutes = data.minimum_booking_minutes;
    if (data.maximum_booking_minutes != null) updateData.maximum_booking_minutes = data.maximum_booking_minutes;

    // 5. Actualizar
    return SpaceRepository.update(space, updateData);
};

/**
 * Detalle de un espacio deportivo por public_id — valida que la sucursal del espacio
 * esté dentro del alcance del usuario (user.company_ids).
 */
export const spaceById = async (spacePublicId: string, user: AuthenticatedUser) => {
    const spaceId = await SpaceRepository.getSpaceIdByPublicId(spacePublicId);
    if (!spaceId) throw new NotFoundError('Espacio deportivo no encontrado');

    const space = await SpaceRepository.findById(spaceId);
    if (!space) throw new NotFoundError('Espacio deportivo no encontrado');

    assertCompanyScope(user, space.sucursal_id, 'No tenés acceso a este espacio');
    return space;
};

/**
 * Cambio de estado del espacio (ACTIVE | MAINTENANCE | INACTIVE) — lo que mueve
 * el switch de estado de la página Space.
 *   - Scope: mismo criterio que update — la sucursal del espacio tiene que estar
 *     dentro del alcance del usuario (system entra a cualquiera).
 *   - Solo escribe status_space + auditoría (user_update): el resto de los datos
 *     del espacio no se tocan.
 */
export const toggleStatus = async (spacePublicId: string, data: SpaceStatusInput, user: AuthenticatedUser) => {
    // 1. Resolver espacio y validar scope sobre SU sucursal
    const spaceId = await SpaceRepository.getSpaceIdByPublicId(spacePublicId);
    if (!spaceId) throw new NotFoundError('Espacio deportivo no encontrado');

    const space = await SpaceRepository.findById(spaceId);
    if (!space) throw new NotFoundError('Espacio deportivo no encontrado');

    assertCompanyScope(user, space.sucursal_id, 'No tenés acceso a este espacio');

    // 2. Solo el estado cambia (el schema Joi ya valida el valor del ENUM)
    return SpaceRepository.update(space, {
        status_space: data.status,
        user_update: user.user_id,
    });
};