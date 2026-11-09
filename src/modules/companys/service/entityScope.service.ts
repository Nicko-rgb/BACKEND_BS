import type { Transaction } from 'sequelize';
import * as CompanyRepository from '../repository/company.repository';
import * as SpaceRepository from '../repository/space.repository';
import { assertCompanyScope } from '../../../shared/utils/accessScope';
import { NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';

/**
 * Resolución de entidades del módulo companys con su validación de alcance.
 *
 * Vive en un solo lugar para que empresa/sucursal/espacio/horarios/galería y
 * los bookings validen pertenencia con las mismas reglas, sin repetir la
 * búsqueda por public_id ni el mensaje de error. El permiso de la acción lo
 * exige la ruta; acá solo se valida a QUÉ entidad puede entrar el usuario.
 */

/** Sucursal por public_id — 404 si no existe, 403 si está fuera de su alcance. */
export const resolveSucursalForUser = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(sucursalPublicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');

    assertCompanyScope(user, sucursal.company_id, 'No tenés acceso a esta sucursal');
    return sucursal;
};

/**
 * Espacio por public_id — 404 si no existe, 403 si su sucursal está fuera del
 * alcance. Con transacción bloquea la fila: las altas de reserva serializan así
 * los cambios de horario del mismo espacio.
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

    assertCompanyScope(user, space.sucursal_id, 'No tenés acceso a este espacio');
    return space;
};
