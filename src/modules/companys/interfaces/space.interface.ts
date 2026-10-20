/**
 * Contratos de payload del espacio deportivo — capa de entrada del service.
 *
 * Las interfaces viven acá (y no en `service/space.service.ts`) para que la
 * capa de servicio quede solo con lógica: los tipos se importan desde acá.
 * Espeja `space.schema.ts` (mismos nombres snake_case que espera el endpoint).
 */

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

// Actualización parcial — mismo shape que el alta, todos los campos opcionales.
export type UpdateSpaceInput = Partial<RegisterSpaceInput>;

// Estado del espacio — mismo juego que el ENUM de status_space.
export type SpaceStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

// Cambio de estado (switch de la página Space).
export interface SpaceStatusInput {
    status: SpaceStatus;
}

// Campos que el service puede escribir al actualizar + auditoría (`user_update`).
// Excluye a propósito sucursal_id, tenant_id, public_id y user_create: son
// inmutables para el espacio una vez creado.
export interface SpaceUpdateData extends Partial<RegisterSpaceInput> {
    user_update: number;
}
