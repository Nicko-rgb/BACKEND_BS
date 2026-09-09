/**
 * Modelo UserCompany - Asignación contextual de usuarios a empresas/sucursales
 *
 * Relación muchos-a-muchos: un usuario puede tener varias filas, una por cada
 * empresa/sucursal a la que fue asignado (único índice es user_id+company_id,
 * no user_id solo). El campo `role` es varchar — no es FK funcional. Los
 * accesos se evalúan por user_permissions; verificarScope valida el
 * company_id solicitado contra TODOS los company_ids asignados al usuario.
 *
 * Jerarquía:
 *   system        → sin restricción (no requiere registro aquí)
 *   super_admin   → una o varias empresas principales (company con parent_company_id NULL)
 *   administrador → una o varias sucursales
 *   empleado      → una o varias sucursales
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from './User';

export class UserCompany extends Model<InferAttributes<UserCompany>, InferCreationAttributes<UserCompany>> {
    declare user_company_id: CreationOptional<number>;
    declare user_id: number;
    declare company_id: number;
    // Clasificador de rol en este contexto (no FK — no controla accesos, solo display).
    // Valores: 'super_admin', 'administrador', 'empleado'
    declare role: string;
    declare tenant_id: string;
    declare is_active: CreationOptional<boolean>;
    declare created_by: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    // Asociación (poblada por include, no es columna propia) ──────────────────
    declare user?: NonAttribute<User>;
}

UserCompany.init({
    user_company_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la asignación usuario-empresa'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario asignado'
    },
    company_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_company', key: 'company_id' },
        comment: 'Empresa o sucursal a la que pertenece el usuario'
    },
    role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Clasificador del rol del usuario en esta empresa/sucursal (solo display)'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'tenant_id de la empresa raíz, para filtrado rápido por tenant'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la asignación está activa'
    },
    created_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que realizó la asignación'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    tableName: 'dsg_bss_user_company',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        // Un usuario solo puede tener una asignación por empresa/sucursal ──────────────
        { unique: true, fields: ['user_id', 'company_id'], name: 'unique_user_company' },
        { fields: ['user_id'], name: 'idx_user_company_user' },
        { fields: ['company_id'], name: 'idx_user_company_company' },
        { fields: ['tenant_id'], name: 'idx_user_company_tenant' }
    ],
    comment: 'Asignación de usuarios a empresas/sucursales con su rol contextual'
});

// TODO: wire UserCompany→Company cuando se porte `companys`.
export function associateUserCompany(models: { User: typeof User }): void {
    UserCompany.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
}
