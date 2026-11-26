import type { Transaction } from 'sequelize';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import { NotFoundError } from '../../../shared/errors/CustomErrors';
import { assertEntityAccess } from '../../../shared/utils/accessScope';
import * as CompanyRepository from '../repository/company.repository';
import * as SpaceRepository from '../repository/space.repository';

/**
 * Resolución de entidades del dominio companys con validación de alcance.
 *
 * El front manda siempre `public_id` (nunca ids internos): estas funciones resuelven
 * el `public_id` a la fila y validan el acceso del usuario contra la sucursal
 * correspondiente (`assertEntityAccess`). El alcance vive en shared/utils/accessScope;
 * acá solo se resuelve la entidad y se delega el chequeo de acceso.
 */

/** Sucursal por public_id — 404 si no existe, 403 si está fuera del alcance. */
export const resolveSucursalForUser = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(sucursalPublicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');

    await assertEntityAccess(user, sucursal.company_id);
    return sucursal;
};

/**
 * Espacio por public_id — 404 si no existe, 403 si su sucursal está fuera del alcance.
 * Con transacción bloquea la fila: las altas de reserva serializan así los cambios de
 * horario del mismo espacio.
 */
export const resolveSpaceForUser = async (
    spacePublicId: string,
    user: AuthenticatedUser,
    transaction?: Transaction,
) => {
    const spaceId = await SpaceRepository.getSpaceIdByPublicId(spacePublicId);
    if (!spaceId) throw new NotFoundError('Espacio deportivo no encontrado');

    const space = transaction
        ? await SpaceRepository.lockById(spaceId, transaction)
        : await SpaceRepository.findById(spaceId);
    if (!space) throw new NotFoundError('Espacio deportivo no encontrado');

    await assertEntityAccess(user, space.sucursal_id);
    return space;
};

/**
 * Espacio por su PK interna — para entidades hijas que ya la conocen (ej. una reserva).
 * 404 si no existe, 403 si su sucursal está fuera del alcance.
 */
export const resolveSpaceByIdForUser = async (spaceId: number, user: AuthenticatedUser) => {
    const space = await SpaceRepository.findById(spaceId);
    if (!space) throw new NotFoundError('Espacio deportivo no encontrado');

    await assertEntityAccess(user, space.sucursal_id);
    return space;
};
