import { toUserDetailDto } from './user.dto';
import type { User } from '../database/models';

// Empresa o sucursal a la que está asignado un usuario gestionado.
export interface ManagedAssignment {
    tenantId: string;
    name: string;
    role: string;
}

// Detalle de un usuario gestionado — mismo detalle que el perfil más sus asignaciones.
export const toManagedUserDto = (user: User, assignments: ManagedAssignment[]) => ({
    ...toUserDetailDto(user),
    assignments,
});
