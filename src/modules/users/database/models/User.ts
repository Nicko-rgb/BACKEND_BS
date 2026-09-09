/**
 * Modelo User - Gestión de usuarios del sistema
 *
 * Este modelo maneja la información básica de autenticación y contacto de los usuarios.
 * Los usuarios pueden ser clientes que reservan espacios deportivos, administradores
 * de instalaciones, o administradores del sistema.
 *
 * El campo `role` es un clasificador de display (varchar) — no es una FK funcional.
 * Todos los accesos se evalúan exclusivamente por user_permissions.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import type { Person } from './Person';
import type { UserFavorite } from './UserFavorite';
import type { UserCompany } from './UserCompany';
import type { UserPermission } from './UserPermission';
import type { UserPageTour } from './UserPageTour';
import type { Media } from '../../../system/database/models';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare user_id: CreationOptional<number>;
    declare first_name: string | null;
    declare last_name: string | null;
    declare email: string | null;
    declare password: string | null;
    declare social_id: string | null;
    declare social_provider: string | null;
    // Clasificador de display del usuario — no es FK ni controla acceso.
    // Los accesos se evalúan exclusivamente por user_permissions.
    // Valores: 'cliente', 'empleado', 'administrador', 'super_admin', 'system'
    declare role: string | null;
    declare is_enabled: CreationOptional<boolean>;
    declare user_create: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    // Asociaciones (poblado por include, no columnas propias) ─────────────────
    declare person?: NonAttribute<Person>;
    declare favorites?: NonAttribute<UserFavorite[]>;
    declare companyAssignments?: NonAttribute<UserCompany[]>;
    declare directPermissions?: NonAttribute<UserPermission[]>;
    declare pageTours?: NonAttribute<UserPageTour[]>;
    declare media?: NonAttribute<Media[]>;
}

User.init({
    user_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del usuario'
    },
    first_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Nombre del usuario'
    },
    last_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Apellido del usuario'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        comment: 'Correo electrónico del usuario'
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: true, // Permitir null para usuarios de redes sociales
        comment: 'Contraseña del usuario (encriptada)'
    },
    social_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Identificador único del usuario en el proveedor de autenticación social'
    },
    social_provider: {
        type: DataTypes.STRING(50),
        allowNull: true, // 'google', 'facebook', 'apple', etc.
        comment: 'Proveedor de autenticación social (google, facebook, apple, etc.)'
    },
    role: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Clasificador de tipo de usuario (solo display, los accesos van por user_permissions)'
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el usuario está habilitado para autenticarse'
    },
    user_create: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'Usuario que creó el registro si viene del sistema SYSTEM'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de creación del registro'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de actualización del registro'
    }
}, {
    sequelize,
    tableName: 'dsg_bss_user',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        // Índice compuesto para login social (proveedor + id externo) ─────────────────
        {
            name: 'idx_user_social_provider_id',
            fields: ['social_provider', 'social_id']
        },
        // Índice para filtrar usuarios habilitados/deshabilitados ─────────────────────
        {
            name: 'idx_user_is_enabled',
            fields: ['is_enabled']
        }
    ]
});

// Definir asociaciones — solo las que caen dentro de módulos ya portados.
// TODO: wire cuando se porten booking (Booking), companys (Rating) y media (Media polimórfica).
export function associateUser(models: {
    Person: typeof Person;
    UserFavorite: typeof UserFavorite;
    UserCompany: typeof UserCompany;
    UserPermission: typeof UserPermission;
    UserPageTour: typeof UserPageTour;
    Media: typeof Media;
}): void {
    User.hasOne(models.Person, { foreignKey: 'user_id', as: 'person' });
    User.hasMany(models.UserFavorite, { foreignKey: 'user_id', as: 'favorites' });
    User.hasMany(models.UserCompany, { foreignKey: 'user_id', as: 'companyAssignments' });
    User.hasMany(models.UserPermission, { foreignKey: 'user_id', as: 'directPermissions' });
    User.hasMany(models.UserPageTour, { foreignKey: 'user_id', as: 'pageTours' });
    User.hasMany(models.Media, { foreignKey: 'medible_id', constraints: false, scope: { medible_type: 'User' }, as: 'media' });
    User.belongsTo(User, { foreignKey: 'user_create', as: 'creator' });
}
