/**
 * Modelo User - Gestión de usuarios del sistema
 *
 * Este modelo maneja la información básica de autenticación y contacto de los usuarios.
 * Los usuarios pueden ser clientes que reservan espacios deportivos, administradores
 * de instalaciones, o administradores del sistema.
 *
 * `role_id` (FK a dsg_bss_role) aporta etiqueta + scope + menú — ver
 * authorizationResolver.ts. Los permisos viven en el set propio del usuario
 * (dsg_bss_user_permissions). No hay columna `role` de texto: el rol se lee
 * siempre vía el join a `roleRef` (dsg_bss_role).
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import { idPublicId } from '../../../../shared/utils/ids';
import type { UserFavorite } from './UserFavorite';
import type { UserCompany } from './UserCompany';
import type { UserPermission } from './UserPermission';
import type { UserPageTour } from './UserPageTour';
import type { Country, Media, PaymentType, Role, Ubigeo } from '../../../system/database/models';
import type { DocumentType, Gender } from '../../interfaces/user.interface';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare user_id: CreationOptional<number>;
    declare public_id: CreationOptional<string>;
    declare first_name: string;
    declare last_name: string;
    declare email: string | null;
    declare password: string | null;
    declare password_changed_at: Date | null;
    declare social_id: string | null;
    declare social_provider: string | null;
    // Fuente de verdad para etiqueta/scope/menú (ver authorizationResolver.ts).
    // Los permisos salen de dsg_bss_user_permissions, no del rol.
    declare role_id: number;
    declare is_enabled: CreationOptional<boolean>;

    // Perfil del usuario — antes vivía en dsg_bss_person (relación 1:1).
    declare country_id: number | null;
    declare date_birth: string | null;
    declare gender: Gender | null;
    declare document_type: DocumentType | null;
    declare document_number: string | null;
    declare phone: string | null;
    declare ubigeo_id: number | null;
    declare preferences: unknown | null;
    declare default_payment_type_id: number | null;
    declare source_from: string | null;

    declare user_create: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    // Asociaciones (poblado por include, no columnas propias) ─────────────────
    declare country?: NonAttribute<Country>;
    declare ubigeo?: NonAttribute<Ubigeo>;
    declare defaultPaymentType?: NonAttribute<PaymentType>;
    declare favorites?: NonAttribute<UserFavorite[]>;
    declare companyAssignments?: NonAttribute<UserCompany[]>;
    declare directPermissions?: NonAttribute<UserPermission[]>;
    declare pageTours?: NonAttribute<UserPageTour[]>;
    declare media?: NonAttribute<Media[]>;
    declare roleRef?: NonAttribute<Role>;
}

User.init({
    user_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del usuario'
    },
    public_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: () => idPublicId(),
        comment: 'Identificador público único por fila — lo único expuesto en URLs'
    },
    first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del usuario'
    },
    last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
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
    password_changed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Último cambio de contraseña — invalida los JWT emitidos antes de esta fecha'
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
    role_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_role', key: 'role_id' },
        comment: 'Rol del usuario — fuente de verdad para permisos/menú/scope'
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el usuario está habilitado para autenticarse'
    },
    country_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_country', key: 'country_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'País del usuario'
    },
    date_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fecha de nacimiento'
    },
    gender: {
        type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED'),
        allowNull: true,
        comment: 'Género del usuario'
    },
    document_type: {
        type: DataTypes.ENUM('IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER'),
        allowNull: true,
        comment: 'Tipo de documento de identidad'
    },
    document_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Número del documento de identidad'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Número de teléfono del usuario'
    },
    ubigeo_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_ubigeo', key: 'ubigeo_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Ubigeo de residencia'
    },
    preferences: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Preferencias de notificaciones, privacidad y pantalla'
    },
    default_payment_type_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_payment_types', key: 'payment_type_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Tipo de pago preferido del usuario'
    },
    source_from: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Origen del registro (web, admin, booking, etc.)'
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
        },
        {
            unique: true,
            name: 'unique_user_public_id',
            fields: ['public_id']
        }
    ]
});

// Definir asociaciones — solo las que caen dentro de módulos ya portados.
// TODO: wire cuando se porten booking (Booking), companys (Rating) y media (Media polimórfica).
export function associateUser(models: {
    UserFavorite: typeof UserFavorite;
    UserCompany: typeof UserCompany;
    UserPermission: typeof UserPermission;
    UserPageTour: typeof UserPageTour;
    Country: typeof Country;
    PaymentType: typeof PaymentType;
    Ubigeo: typeof Ubigeo;
    Media: typeof Media;
    Role: typeof Role;
}): void {
    User.hasMany(models.UserFavorite, { foreignKey: 'user_id', as: 'favorites' });
    User.hasMany(models.UserCompany, { foreignKey: 'user_id', as: 'companyAssignments' });
    User.hasMany(models.UserPermission, { foreignKey: 'user_id', as: 'directPermissions' });
    User.hasMany(models.UserPageTour, { foreignKey: 'user_id', as: 'pageTours' });
    User.hasMany(models.Media, { foreignKey: 'medible_id', constraints: false, scope: { medible_type: 'User' }, as: 'media' });
    User.belongsTo(User, { foreignKey: 'user_create', as: 'creator' });
    User.belongsTo(models.Role, { foreignKey: 'role_id', as: 'roleRef' });
    User.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });
    User.belongsTo(models.Ubigeo, { foreignKey: 'ubigeo_id', as: 'ubigeo' });
    User.belongsTo(models.PaymentType, { foreignKey: 'default_payment_type_id', as: 'defaultPaymentType' });
}
