/**
 * Modelo Persona - Información personal detallada de usuarios
 *
 * Este modelo almacena datos personales específicos de los usuarios como
 * fecha de nacimiento, género, documento de identidad, ubigeo de residencia,
 * y otros datos demográficos importantes para el sistema de reservas deportivas.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from './User';
import type { Country, PaymentType, Ubigeo } from '../../../system/database/models';

type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';
type DocumentType = 'IDENTITY_CARD' | 'PASSPORT' | 'LICENSE' | 'OTHER';
type CivilState = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'COMMON-LAW';

export class Person extends Model<InferAttributes<Person>, InferCreationAttributes<Person>> {
    declare persona_id: CreationOptional<number>;
    declare user_id: number;
    declare country_id: number;
    declare date_birth: string | null;
    declare gender: Gender | null;
    declare document_type: DocumentType | null;
    declare document_number: string | null;
    declare phone: string | null;
    declare ubigeo_id: number | null;
    declare occupation: string | null;
    declare civil_state: CivilState | null;
    declare sports_preferences: unknown | null;
    declare accept_marketing: CreationOptional<boolean>;
    declare preferences: unknown | null;
    declare default_payment_type_id: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    // Asociación (poblada por include, no es columna propia) ──────────────────
    declare country?: NonAttribute<Country>;
}

Person.init({
    persona_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'ID del usuario dueño de estos datos personales'
    },
    country_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_country', key: 'country_id' },
        comment: 'ID del país al que pertenece la persona'
    },
    date_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fecha de nacimiento'
    },
    gender: {
        type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED'),
        allowNull: true,
        comment: 'Género de la persona'
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
        comment: 'Ubigeo de residencia — solo lo usa el portal cliente, para buscar sucursales cercanas'
    },
    occupation: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Ocupación o profesión'
    },
    civil_state: {
        type: DataTypes.ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COMMON-LAW'),
        allowNull: true,
        comment: 'Estado civil'
    },
    sports_preferences: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Deportes o actividades de preferencia'
    },
    accept_marketing: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Acepta recibir comunicaciones de marketing'
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
        comment: 'Tipo de pago preferido del usuario'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_person',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla que almacena información personal detallada de los usuarios',
    indexes: [
        // Índice único: un registro de persona por usuario ────────────────────────────
        { name: 'idx_person_user_id_unique', unique: true, fields: ['user_id'] },
        // Índice para buscar persona por número de documento ──────────────────────────
        { name: 'idx_person_document_number', fields: ['document_number'] },
        // Índice para filtrar personas por país ────────────────────────────────────────
        { name: 'idx_person_country_id', fields: ['country_id'] }
    ]
});

export function associatePerson(models: {
    User: typeof User;
    Country: typeof Country;
    PaymentType: typeof PaymentType;
    Ubigeo: typeof Ubigeo;
}): void {
    Person.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Person.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });
    Person.belongsTo(models.PaymentType, { foreignKey: 'default_payment_type_id', as: 'defaultPaymentType' });
    Person.belongsTo(models.Ubigeo, { foreignKey: 'ubigeo_id', as: 'ubigeo' });
}
