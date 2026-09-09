import * as UserPermissionRepository from '../repository/userPermission.repository';
import * as UserRepository from '../repository/user.repository';
import * as PermissionRepository from '../../system/repository/permission.repository';
import { NotFoundError, ValidationError } from '../../../shared/errors/CustomErrors';

// Keys de los permisos directos de un usuario — para precargar el picker de checkboxes.
export const getKeysByUserId = async (userId: number): Promise<string[]> => {
    const user = await UserRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado');

    return UserPermissionRepository.findKeysByUserId(userId);
};

/**
 * Reemplaza el set completo de permisos directos de un usuario. Valida contra el catálogo de
 * `system` (vía su repository, no importando el modelo directo — mismo criterio que
 * plan.service.ts con saasPlan.repository) que todas las keys recibidas existan de verdad,
 * para no dejar entrar una key inventada por un request manual.
 */
export const replaceForUser = async (userId: number, keys: string[], grantedBy: number): Promise<string[]> => {
    const user = await UserRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado');

    if (keys.length > 0) {
        const found = await PermissionRepository.findByKeys(keys);
        const foundKeys = new Set(found.map((permission) => permission.key));
        const invalid = keys.filter((key) => !foundKeys.has(key));
        if (invalid.length > 0) {
            throw new ValidationError(`Permisos inexistentes: ${invalid.join(', ')}`);
        }
    }

    await UserPermissionRepository.replaceForUser(userId, keys, grantedBy);
    return UserPermissionRepository.findKeysByUserId(userId);
};
