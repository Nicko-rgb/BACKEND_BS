/**
 * Membresía explícita de usuario a una empresa raíz (parent_company_id IS NULL).
 * Es una de las dos fuentes de verdad del acceso (la otra es `dsg_bss_user_sucursal`):
 * el alcance efectivo es la unión de las filas activas de ambas tablas, sin herencia
 * por tenant ni por rol. El dueño del tenant se declara en
 * `dsg_bss_company.owner_user_id`, no acá; el rol y los permisos efectivos viven en
 * User/UserPermission.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from './User';

export class UserCompany extends Model<InferAttributes<UserCompany>, InferCreationAttributes<UserCompany>> {
    declare user_company_id: CreationOptional<number>;
    declare user_id: number;
    declare company_id: number;
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
        comment: 'Empresa raíz a la que pertenece el usuario (parent_company_id IS NULL)'
    },
    tenant_id: {
        type: DataTypes.UUID,
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
        // Un usuario solo puede tener una asignación por empresa ────────────────────────
        { unique: true, fields: ['user_id', 'company_id'], name: 'unique_user_company' },
        { fields: ['user_id'], name: 'idx_user_company_user' },
        { fields: ['company_id'], name: 'idx_user_company_company' },
        { fields: ['tenant_id'], name: 'idx_user_company_tenant' }
    ],
    comment: 'Asignación de usuarios a empresas raíz (acceso explícito por empresa)'
});

export function associateUserCompany(models: { User: typeof User }): void {
    UserCompany.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
}
