/**
 * Modelo Role — Catálogo de roles del sistema
 *
 * Fuente de verdad de a qué permisos (RolePermission) y qué ítems de menú
 * (RoleMenuItem) accede cada rol, y de su scope_level (alcance de datos).
 * Reemplaza al varchar libre `dsg_bss_user.role` para todo lo que sea
 * autorización — ver authorizationResolver.ts.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
    declare role_id: CreationOptional<number>;
    declare key: string;
    declare label: string;
    // 1=system (todo), 2=super_admin (sus empresas), 3=administrador (sus sucursales),
    // 4=empleado (sus sucursales). NULL en roles fuera del scope admin (ej. cliente).
    declare scope_level: number | null;
    declare is_active: CreationOptional<boolean>;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

Role.init({
    role_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    key: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Identificador único del rol (ej: administrador, super_admin)',
    },
    label: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre legible para mostrar en UI',
    },
    scope_level: {
        type: DataTypes.SMALLINT,
        allowNull: true,
        comment: 'Alcance de datos: 1=system, 2=super_admin, 3=administrador, 4=empleado, NULL=no aplica',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    tableName: 'dsg_bss_role',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Catálogo de roles del sistema',
});
