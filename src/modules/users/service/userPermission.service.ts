import * as UserPermissionRepository from '../repository/userPermission.repository';
import * as UserRepository from '../repository/user.repository';
import * as PermissionRepository from '../../system/repository/permission.repository';
import { invalidateUserAuthCache } from '../../../shared/utils/authorizationCache';
import { NotFoundError, ValidationError } from '../../../shared/errors/CustomErrors';

// Keys de las excepciones (grant, hoy solo eso — ver replaceForUser) de un usuario — para
// precargar el picker de checkboxes. Lookup por public_id, uso interno por user_id.
export const getKeysByUserId = async (publicId: string): Promise<string[]> => {
    const user = await UserRepository.findByPublicId(publicId);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    const userId = Number(user.user_id);

    return UserPermissionRepository.findKeysByUserId(userId);
};

/**
 * Reemplaza el set completo de excepciones (grant) de un usuario sobre el set base de su rol.
 * Valida contra el catálogo de `system` (vía su repository, no importando el modelo directo —
 * mismo criterio que plan.service.ts con saasPlan.repository) que todas las keys recibidas
 * existan de verdad, para no dejar entrar una key inventada por un request manual.
 *
 * Invalida el cache de autorización del usuario — el cambio debe aplicar de inmediato, sin
 * esperar a que renueve sesión (misma razón que role.service.ts::replacePermissions).
 */
export const replaceForUser = async (publicId: string, keys: string[], grantedBy: number): Promise<string[]> => {
    const user = await UserRepository.findByPublicId(publicId);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    const userId = Number(user.user_id);

    // system.full_access solo lo tiene el rol system — nunca se otorga como excepción por usuario.
    if (keys.includes('system.full_access')) {
        throw new ValidationError('El permiso "system.full_access" es exclusivo del rol system');
    }

    if (keys.length > 0) {
        const found = await PermissionRepository.findByKeys(keys);
        const foundKeys = new Set(found.map((permission) => permission.key));
        const invalid = keys.filter((key) => !foundKeys.has(key));
        if (invalid.length > 0) {
            throw new ValidationError(`Permisos inexistentes: ${invalid.join(', ')}`);
        }
    }

    await UserPermissionRepository.replaceForUser(userId, keys, grantedBy);
    await invalidateUserAuthCache(userId);
    return UserPermissionRepository.findKeysByUserId(userId);
};
