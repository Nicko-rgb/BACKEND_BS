/**
 * Contratos de payload del catálogo de permisos — capa de entrada del service
 * `permission.service.ts`.
 *
 * Espeja `permission.schema.ts`.
 */

// Filtros del catálogo de permisos — paginación dinámica (si no trae page/limit, trae todo).
export interface ListPermissionsQuery {
    search?: string;
    module?: string;
    group?: string;
    page?: number;
    limit?: number;
}
