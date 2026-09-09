import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as UserRepository from '../../users/repository/user.repository';
import * as CompanyRepository from '../../companys/repository/company.repository';
import { UnauthorizedError, ForbiddenError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';

interface LoginAdminInput {
    email: string;
    password: string;
}

/**
 * Login del panel admin. Bloquea usuarios con role 'cliente' — ese rol es
 * exclusivo del portal de reservas (BOOKING), no tiene acceso a este panel.
 *
 * Arma el JWT con `permissions` (directas del usuario, sin resolver rol acá
 * — user_permissions ya es la fuente única) y `company_ids` ya expandido:
 * para super_admin incluye la(s) empresa(s) raíz asignadas MÁS todas sus
 * sucursales; para administrador/empleado son directamente sus sucursales
 * asignadas (expandir sobre una sucursal no devuelve nada, es un no-op).
 */
export const loginAdmin = async ({ email, password }: LoginAdminInput) => {
    const user = await UserRepository.findByEmailForLogin(email);

    if (!user || !user.password) {
        throw new UnauthorizedError('Credenciales requeridas');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
        throw new UnauthorizedError('Contraseña incorrecta');
    }

    if (user?.role === 'cliente') {
        throw new ForbiddenError('Este usuario no tiene acceso a esta app');
    }

    if (!user.is_enabled) {
        throw new ForbiddenError('Usuario deshabilitado');
    }

    const permissions = (user.directPermissions ?? []).map(p => p.permission_key);

    const empresaIds = (user.companyAssignments ?? [])
        .filter(a => a.is_active)
        .map(a => a.company_id);

    const sucursalIds = await CompanyRepository.findSucursalIdsByParentIds(empresaIds);
    const companyIds = [...new Set([...empresaIds, ...sucursalIds])];

    const payload: AuthenticatedUser = {
        user_id: user.user_id,
        email: user.email ?? undefined,
        name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
        role: user.role ?? 'cliente',
        permissions,
        company_ids: companyIds,
        app: 'admin',
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
        expiresIn: (process.env.JWT_EXPIRES || '12h') as jwt.SignOptions['expiresIn'],
    });

    return { token, user, permissions, companyIds };
};
