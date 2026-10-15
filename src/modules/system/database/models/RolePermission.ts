/**
 * Modelo RolePermission — Plantilla de permisos iniciales de cada rol
 *
 * Al crear un usuario se le copia la plantilla de su rol a su set propio
 * (dsg_bss_user_permissions) — después vive independiente: editar acá desde
 * System > Roles solo afecta a usuarios NUEVOS, nunca a existentes.
 * Sembrado inicialmente por database/seeders/003_role_permission.ts.
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
    comment: 'Plantilla de permisos iniciales asignados a cada rol',
});
