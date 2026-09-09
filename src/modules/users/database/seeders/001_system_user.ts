/**
 * Seed: usuario system — bootstrap del sistema nuevo.
 * `seedName: 'systemUserSeed'` es un nombre especial para seederRunner.ts:
 * si lo ejecuta acá, o si ya estaba corrido antes, resuelve su user_id y se
 * lo pasa a cualquier seed posterior con `dependsOnSystemUser: true`.
 *
 * Corre después de roleSeed (system/002_role.ts, order 11) — necesita el
 * role_id del rol 'system'. Email/password salen de SYSTEM_SEED_EMAIL/
 * SYSTEM_SEED_PASSWORD (.env) — cambiar la contraseña por defecto apenas se
 * loguea la primera vez, no queda pensada para producción tal cual.
 */
import bcrypt from 'bcryptjs';
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import { User } from '../models';
import { Role } from '../../../system/database/models';

const seedFn = async (): Promise<number | void> => {
    const email = process.env.SYSTEM_SEED_EMAIL || 'system@gmail.com';

    const existing = await User.findOne({ where: { email } });
    if (existing) return existing.user_id;

    const systemRole = await Role.findOne({ where: { key: 'system' } });
    if (!systemRole) {
        throw new Error('No se encontró el rol "system" — corré roleSeed antes que systemUserSeed.');
    }

    const password = process.env.SYSTEM_SEED_PASSWORD;
    if (!password) {
        throw new Error('SYSTEM_SEED_PASSWORD no está definida en .env — requerida para crear el usuario system.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const systemUser = await User.create({
        first_name: 'System',
        last_name: 'Admin',
        email,
        password: hashedPassword,
        social_id: null,
        social_provider: null,
        role_id: systemRole.role_id,
        is_enabled: true,
        user_create: null,
    });

    return systemUser.user_id;
};

const config: SeederConfig = {
    seedName: 'systemUserSeed',
    seedFn,
    environment: 'essential',
    order: 12, // después de roleSeed (order 11) — necesita su role_id
};

module.exports = config;
