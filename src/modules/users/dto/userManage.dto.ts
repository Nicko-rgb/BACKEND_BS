import { toUserDetailDto } from './user.dto';
import type { User } from '../database/models';

// Empresa o sucursal a la que está asignado un usuario gestionado — solo public_id, nunca ids internos ni tenant.
export interface ManagedAssignment {
    publicId: string;
    name: string;
    role: string;
}

// Detalle de un usuario gestionado — mismo detalle que el perfil más sus asignaciones.
export const toManagedUserDto = (user: User, assignments: ManagedAssignment[]) => ({
    ...toUserDetailDto(user),
    assignments,
});
