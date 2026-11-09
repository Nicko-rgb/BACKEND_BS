import type { Transaction } from 'sequelize';
import * as UserRepository from '../repository/user.repository';
import * as UserPermissionRepository from '../repository/userPermission.repository';
import * as RoleRepository from '../../system/repository/role.repository';
import { assertCountryAvailable } from './user.service';
import { ValidationError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { CreateBookingClientInput } from '../interfaces/userManageBooking.interface';

/**
 * Operaciones de usuario que nacen de una reserva (alta manual desde el
 * calendario admin). Vive separado de `userManage.service.ts` —que administra
 * clientes de forma global— y de `user.service.ts` —autogestión del propio
 * usuario—.
 *
 * No abre transacción propia: siempre corre dentro de la del llamador para que
 * usuario, pago y reserva se confirmen o reviertan juntos.
 */

/** Alta de cliente sin contraseña ni asignación a empresa/sucursal. */
export const createBookingClient = async (
    data: CreateBookingClientInput,
    countryId: number,
    user: AuthenticatedUser,
    transaction: Transaction,
) => {
    // El rol es fijo: este service solo registra el cliente que viene con una
    // reserva. El permiso de la operación lo exige la ruta que lo invoca.
    const role = await RoleRepository.findByKey('cliente');
    if (!role?.is_active) throw new ValidationError('El rol cliente no está disponible');
    await assertCountryAvailable(countryId);

    const email = data.email?.trim() || null;

    // Si el correo ya existe, la reserva reutiliza esa cuenta tal cual: no se
    // crea un usuario nuevo ni se modifican sus datos, rol, permisos o credenciales.
    if (email) {
        const existing = await UserRepository.findByEmail(email);
        if (existing) return { client: existing };
    }

    const client = await UserRepository.create({
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        email,
        role_id: role.role_id,
        user_create: user.user_id,
        country_id: countryId,
        phone: data.phone.trim(),
        source_from: 'booking_administrator',
    }, transaction);
    await UserPermissionRepository.grantRoleDefaults(client.user_id, role.role_id, user.user_id, transaction);

    return { client };
};
