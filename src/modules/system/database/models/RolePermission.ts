/**
 * Modelo RolePermission — Set de permisos base de cada rol
 *
 * Fuente de verdad en runtime de qué permisos tiene cada rol — editable
 * desde System > Roles sin tocar código ni usuarios uno por uno. Sembrado
 * inicialmente por database/seeders/003_role_permission.ts.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

export class RolePermission extends Model<InferAttributes<RolePermission>, InferCreationAttributes<RolePermission>> {
    declare role_permission_id: CreationOptional<number>;
    declare role_id: number;
    declare permission_key: string;
    declare readonly created_at: CreationOptional<Date>;
}

RolePermission.init({
    role_permission_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    role_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_role', key: 'role_id' },
    },
    permission_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Clave del permiso (FK real a dsg_bss_permissions.key)',
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    sequelize,
    tableName: 'dsg_bss_role_permission',
    timestamps: false,
    indexes: [
        { unique: true, fields: ['role_id', 'permission_key'], name: 'unique_role_permission' },
        { fields: ['permission_key'], name: 'idx_role_permission_key' },
    ],
    comment: 'Permisos base asignados a cada rol',
});
