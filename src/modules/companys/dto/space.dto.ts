import type { Space } from '../database/models';

interface SpacePublic {
    publicId: string;
    name: string;
    sport: string | null;
    sportTypeId: number;

    surfaceName: string;
    surfaceTypeId: number;
    categoryName: string;
    sportCategoryId: number;
    capacity: number | null;
    dimensions: string;
    equipment: string | null;
    minimumBookingMinutes: number;
    maximumBookingMinutes: number;
    status: string;
    createdAt: Date;
}

/**
 * Forma de un espacio para el frontend — solo `public_id` (nunca `space_id`,
 * `sucursal_id` ni `tenant_id`).
 */
export const toSpaceDto = (space: Space): SpacePublic => ({
    publicId: space.public_id,
    name: space.name,
    sport: space.sportType?.name ?? null,
    sportTypeId: space.sport_type_id,
    surfaceName: space.surfaceType?.name ?? '',
    surfaceTypeId: space.surface_type_id,
    categoryName: space.sportCategory?.name ?? '',
    sportCategoryId: space.sport_category_id,
    capacity: space.capacity,
    dimensions: space.dimensions,
    equipment: space.equipment,
    minimumBookingMinutes: space.minimum_booking_minutes,
    maximumBookingMinutes: space.maximum_booking_minutes,
    status: space.status_space,
    createdAt: space.created_at,
});

