import * as UserPermissionRepository from '../repository/userPermission.repository';
import * as UserRepository from '../repository/user.repository';
import * as UserCompanyRepository from '../repository/userCompany.repository';
import * as CompanyRepository from '../../companys/repository/company.repository';
import * as PermissionRepository from '../../system/repository/permission.repository';
import { invalidateUserAuthCache } from '../../../shared/utils/authorizationCache';
import { hasFullCompanyAccess, hasCompanyScope } from '../../../shared/utils/accessScope';
import { canAssignRole } from '../../../shared/utils/roleHierarchy';
import { SYSTEM_FULL_ACCESS, isAssignablePermission } from '../constants/userPermissions';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { User } from '../database/models';

/**
 * ¿Puede `granter` gestionar los permisos de `target`? Exige jerarquía de rol
 * (roleHierarchy: solo podés tocar roles que podés asignar, con su permiso) y
 * alcance de empresa (mismo criterio que userManage: system ve todo, el resto
 * solo usuarios dentro de sus empresas; un cliente sin asignaciones se ubica
 * por las empresas de quien lo registró).
 */
const assertCanManageUserPermissions = async (granter: AuthenticatedUser, target: User): Promise<void> => {
    const targetRole = target.roleRef?.key;
    if (!targetRole || !canAssignRole(granter, targetRole)) {
        throw new ForbiddenError('No tenés permisos para gestionar este usuario');
    }
    if (hasFullCompanyAccess(granter)) return;

    const targetId = Number(target.user_id);
    let targetCompanyIds = await UserCompanyRepository.findActiveCompanyIdsByUserId(targetId);
    if (targetCompanyIds.length === 0 && target.user_create) {
        const creatorIds = await UserCompanyRepository.findActiveCompanyIdsByUserId(Number(target.user_create));
        const creatorSucursalIds = await CompanyRepository.findSucursalIdsByParentIds(creatorIds);
        targetCompanyIds = [...creatorIds, ...creatorSucursalIds];
    }

    if (!targetCompanyIds.some((companyId) => hasCompanyScope(granter, companyId))) {
        throw new ForbiddenError('No tenés acceso a este usuario');
    }
};

/**
 * Valida las keys contra el catálogo y contra la lista manual de asignables:
 * un no-system solo puede otorgar lo de ASSIGNABLE_PERMISSION_KEYS (ver
 * constants/userPermissions). `system.full_access` no se otorga nunca como
 * permiso de usuario — lo tiene el rol system en su plantilla y el middleware
 * ya bypasea con él.
 */
const assertKeysAssignable = async (keys: string[], granter: AuthenticatedUser): Promise<void> => {
    if (keys.includes(SYSTEM_FULL_ACCESS)) {
        throw new ValidationError(`El permiso "${SYSTEM_FULL_ACCESS}" es exclusivo del rol system`);
    }
    if (keys.length === 0) return;

    const found = await PermissionRepository.findByKeys(keys);
    const foundKeys = new Set(found.map((permission) => permission.key));
    const invalid = keys.filter((key) => !foundKeys.has(key));
    if (invalid.length > 0) {
        throw new ValidationError(`Permisos inexistentes: ${invalid.join(', ')}`);
    }

    if (granter.permissions.includes(SYSTEM_FULL_ACCESS)) return;

    const blocked = found
        .map((permission) => permission.key)
        .filter((key) => !isAssignablePermission(key));
    if (blocked.length > 0) {
        throw new ForbiddenError(`No podés asignar estos permisos: ${blocked.join(', ')}`);
    }
};

// Set efectivo de permisos de un usuario — para precargar el picker de checkboxes.
// Lookup por public_id, uso interno por user_id.
export const getKeysByUserId = async (publicId: string, actingUser: AuthenticatedUser): Promise<string[]> => {
    const target = await UserRepository.findByPublicId(publicId);
    if (!target) throw new NotFoundError('Usuario no encontrado');

    await assertCanManageUserPermissions(actingUser, target);
    return UserPermissionRepository.findKeysByUserId(Number(target.user_id));
};

/**
 * Reemplaza el set completo de permisos de un usuario.
 *
 * Invalida el cache de autorización del usuario — el cambio debe aplicar de inmediato, sin
 * esperar a que renueve sesión.
 */
export const replaceForUser = async (publicId: string, keys: string[], actingUser: AuthenticatedUser): Promise<string[]> => {
    const target = await UserRepository.findByPublicId(publicId);
    if (!target) throw new NotFoundError('Usuario no encontrado');
    const targetId = Number(target.user_id);

    await assertCanManageUserPermissions(actingUser, target);
    await assertKeysAssignable(keys, actingUser);

    await UserPermissionRepository.replaceForUser(targetId, keys, actingUser.user_id);
    await invalidateUserAuthCache(targetId);
    return UserPermissionRepository.findKeysByUserId(targetId);
};
