import type { PaginationQuery } from '../../../shared/types/pagination';
import type { ProfileFields } from './user.interface';

/**
 * Contratos de payload de la gestión de usuarios por rol — capa de entrada del
 * service `userManage.service.ts`.
 *
 * Espeja `userManage.schema.ts` (mismos nombres snake_case que espera el endpoint).
 */

// Filtros del catálogo global de usuarios.
export interface ListUsersQuery extends PaginationQuery {
    search?: string;
    role?: string;
    countryId?: number;
}

// Perfil que se puede tocar al crear o editar — el perfil más el flag de estado.
export type ManagedProfileInput = ProfileFields & {
    is_enabled?: boolean;
};

// Alta de usuario con el rol de la ruta.
export type CreateManagedUserInput = ManagedProfileInput & {
    password?: string | null;
    sucursales?: string[];
    company_public_id?: string;
};

// Edición de usuario con el rol de la ruta — nunca cambia la contraseña.
export type UpdateManagedUserInput = ManagedProfileInput & {
    role?: string;
    sucursales?: string[];
};
