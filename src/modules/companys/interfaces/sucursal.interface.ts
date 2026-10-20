/**
 * Contratos de payload de la sucursal — capa de entrada del service.
 *
 * Espeja `sucursal.schema.ts` (mismos nombres snake_case que espera el endpoint).
 * Los campos operativos (horario, precio mínimo, características, redes) viven
 * en dsg_bss_configuration y se manejan aparte, en "Configurar" (ver
 * `sucursalConfig.interface.ts`).
 */

export interface RegisterSucursalInput {
    name: string;
    address: string;
    country_id: number;
    ubigeo_id: number;
    phone_cell: string;
    phone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    description?: string | null;
    website?: string | null;
}

// Actualización parcial — mismo shape que el alta, todos los campos opcionales.
export type UpdateSucursalInput = Partial<RegisterSucursalInput>;
