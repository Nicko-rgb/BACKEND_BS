/**
 * Modelo Permission — Catálogo de permisos del sistema
 *
 * Define todas las acciones posibles que pueden ser otorgadas a usuarios.
 * Los permisos se identifican por una clave única tipo 'modulo.accion'
 * (ej: 'booking.confirm', 'space.manage_own').
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

type AppAccess = 'booking' | 'admin' | 'both';
export type PermissionModule = 'bookings' | 'companys' | 'notificacions' | 'saas' | 'system' | 'users';

export class Permission extends Model<InferAttributes<Permission>, InferCreationAttributes<Permission>> {
    declare permission_id: CreationOptional<number>;
    declare key: string;
    declare label: string;
    declare description: string | null;
    // Módulo real del código (carpeta bajo src/modules/) al que pertenece el permiso.
    declare module: PermissionModule;
    // Agrupación funcional dentro de ese módulo (booking, payment, space, sucursal, company...).
    declare group_name: string;
    declare app_access: CreationOptional<AppAccess>;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

Permission.init({
    permission_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Clave única del permiso, formato modulo.accion (ej: booking.confirm)',
    },
    label: {
        type: DataTypes.STRING(150),
        allowNull: false,
        comment: 'Nombre legible para mostrar en UI (ej: Confirmar pago)',
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción detallada de qué permite hacer este permiso',
    },
    module: {
        type: DataTypes.ENUM('bookings', 'companys', 'notificacions', 'saas', 'system', 'users'),
        allowNull: false,
        comment: 'Módulo real del código (carpeta bajo src/modules/) al que pertenece el permiso',
    },
    group_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Agrupación funcional dentro del módulo (booking, payment, space, sucursal, company...)',
    },
    app_access: {
        type: DataTypes.ENUM('booking', 'admin', 'both'),
        allowNull: false,
        defaultValue: 'admin',
        comment: 'En qué app aplica este permiso',
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
    tableName: 'dsg_bss_permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Catálogo de permisos disponibles en el sistema',
    indexes: [
        { name: 'idx_permission_module', fields: ['module'] },
        { name: 'idx_permission_group_name', fields: ['group_name'] },
        { name: 'idx_permission_app_access', fields: ['app_access'] }
    ]
});

// TODO: wire Permission→UserPermission (hasMany, foreignKey permission_key/sourceKey key)
// cuando haga falta el include inverso — hoy UserPermission ya resuelve la relación
// desde su lado (belongsTo lógico por string, sin FK real de Sequelize).
