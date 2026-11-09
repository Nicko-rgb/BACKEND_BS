/**
 * Contratos de usuario que se originan en una reserva — capa de entrada del
 * service `userManageBooking.service.ts`.
 */

/**
 * Cliente sin credenciales que se registra junto con una reserva manual.
 * El país no viaja en el payload: se resuelve desde la sucursal de la reserva.
 */
export interface CreateBookingClientInput {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string | null;
}
