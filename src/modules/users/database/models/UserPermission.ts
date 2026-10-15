/**
 * Modelo UserPermission — Set efectivo de permisos por usuario
 *
 * Cada fila es un permiso otorgado a un usuario — lo que hay acá ES lo que
 * puede hacer (ver authorizationResolver.ts). La plantilla inicial sale de
 * dsg_bss_role_permission según el rol asignado al crear el usuario
 * (userPermission.repository.ts::grantRoleDefaults); después cada usuario
 * vive independiente: editar la plantilla del rol NO toca usuarios existentes.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from './User';

export class UserPermission extends Model<InferAttributes<UserPermission>, InferCreationAttributes<UserPermission>> {
    declare user_permission_id: CreationOptional<number>;
    declare user_id: number;
    declare permission_key: string;
    declare granted_by: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

UserPermission.init({
    user_permission_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
    },
    permission_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Clave del permiso (FK lógica a dsg_bss_permissions.key)',
    },
    granted_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que otorgó este permiso directo',
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    sequelize,
    tableName: 'dsg_bss_user_permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, fields: ['user_id', 'permission_key'], name: 'unique_user_permission' },
        { fields: ['user_id'], name: 'idx_user_permission_user' },
    ],
    comment: 'Set efectivo de permisos otorgados a cada usuario',
});

export function associateUserPermission(models: { User: typeof User }): void {
    UserPermission.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    UserPermission.belongsTo(models.User, { foreignKey: 'granted_by', as: 'grantedByUser' });
}
