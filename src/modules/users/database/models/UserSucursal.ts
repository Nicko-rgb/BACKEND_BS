/**
 * Asignación explícita de un usuario a una sucursal (parent_company_id IS NOT NULL).
 * Complementa dsg_bss_user_company (usuario↔empresa raíz): el acceso se resuelve
 * como la unión de ambas tablas, sin herencia por tenant ni por rol — la fila ES
 * la fuente de verdad. Revocar el acceso a una sucursal es borrar su fila acá.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from './User';

export class UserSucursal extends Model<InferAttributes<UserSucursal>, InferCreationAttributes<UserSucursal>> {
    declare user_sucursal_id: CreationOptional<number>;
    declare user_id: number;
    declare sucursal_id: number;
    declare tenant_id: string;
    declare is_active: CreationOptional<boolean>;
    declare created_by: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    // Asociación (poblada por include, no es columna propia) ──────────────────
    declare user?: NonAttribute<User>;
}

UserSucursal.init({
    user_sucursal_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la asignación usuario-sucursal'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario asignado'
    },
    sucursal_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_company', key: 'company_id' },
        comment: 'Sucursal a la que el usuario tiene acceso'
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
    tableName: 'dsg_bss_user_sucursal',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        // Un usuario solo puede tener una asignación por sucursal ───────────────────────
        { unique: true, fields: ['user_id', 'sucursal_id'], name: 'unique_user_sucursal' },
        { fields: ['user_id'], name: 'idx_user_sucursal_user' },
        { fields: ['sucursal_id'], name: 'idx_user_sucursal_sucursal' },
        { fields: ['tenant_id'], name: 'idx_user_sucursal_tenant' }
    ],
    comment: 'Asignación de usuarios a sucursales (acceso explícito por sucursal)'
});

export function associateUserSucursal(models: { User: typeof User }): void {
    UserSucursal.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
}
