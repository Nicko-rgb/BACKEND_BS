/**
 * Seed: catálogo de roles (dsg_bss_role).
 * TRUNCATE + insert dentro de una transacción — mismo patrón que
 * saas/001_saas_plans.ts. `scope_level`: 1=system (todo), 2=super_admin (sus
 * empresas), 3=administrador (sus sucursales), 4=empleado (sus sucursales),
 * null=cliente (no aplica, es el portal booking). Ver accessScope.ts.
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { Role } from '../models';

const ROLES = [
    { key: 'system', label: 'Sistema', scope_level: 1, is_active: true },
    { key: 'super_admin', label: 'Super admin', scope_level: 2, is_active: true },
    { key: 'administrador', label: 'Administrador', scope_level: 3, is_active: true },
    { key: 'empleado', label: 'Empleado', scope_level: 4, is_active: true },
    { key: 'cliente', label: 'Cliente', scope_level: null, is_active: true },
];

const seedFn = async (): Promise<void> => {
    const t = await sequelize.transaction();
    try {
        // cascade: true porque dsg_bss_user/role_permission/role_menu_item referencian esta
        // tabla por FK — en un sistema recién sembrado esas tablas están vacías igual.
        await Role.destroy({ truncate: true, cascade: true, restartIdentity: true, transaction: t });
        await Role.bulkCreate(ROLES, { transaction: t });
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'roleSeed',
    seedFn,
    environment: 'essential',
    order: 11, // mismo order que su baseline (011_baseline_role) — sin depender de otro seed
};

module.exports = config;
