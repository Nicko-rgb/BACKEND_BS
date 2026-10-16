import type { Space } from '../database/models';

interface SpacePublic {
    publicId: string;
    name: string;
    sport: string | null;
    status: string;
    surfaceTypeId: number;
    sportTypeId: number;
    sportCategoryId: number;
    capacity: number | null;
    dimensions: string;
    equipment: string | null;
    minimumBookingMinutes: number;
    maximumBookingMinutes: number;
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
    surfaceTypeId: Number(space.surface_type_id),
    sportTypeId: Number(space.sport_type_id),
    sportCategoryId: Number(space.sport_category_id),
    status: space.status_space,
    capacity: space.capacity,
    dimensions: space.dimensions,
    equipment: space.equipment,
    minimumBookingMinutes: space.minimum_booking_minutes,
    maximumBookingMinutes: space.maximum_booking_minutes,
    createdAt: space.created_at,
});
