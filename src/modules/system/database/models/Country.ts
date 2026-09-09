/**
 * Modelo Country - Gestión de países del sistema
 *
 * Almacena información de los países donde opera el sistema de reservas
 * deportivas: moneda, código de país, zona horaria y configuraciones
 * específicas por región.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { Ubigeo } from './Ubigeo';
import type { PaymentType } from './PaymentType';

export class Country extends Model<InferAttributes<Country>, InferCreationAttributes<Country>> {
    declare country_id: CreationOptional<number>;
    declare country: string;
    declare iso_country: string;
    declare phone_code: string;
    declare iso_currency: string;
    declare currency: string;
    declare currency_simbol: string;
    declare time_zone: string;
    declare language: string;
    declare date_format: string;
    declare flag_url: string;
    declare user_create: number;
    declare user_update: number | null;
    declare is_active: CreationOptional<boolean>;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

Country.init({
    country_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    country: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del país'
    },
    iso_country: {
        type: DataTypes.STRING(3),
        allowNull: false,
        comment: 'Código ISO alpha-2 del país (ej: AR, PE, CO)'
    },
    phone_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Código telefónico del país (ej: +51, +57, +54)'
    },
    iso_currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        comment: 'Código de moneda ISO (ej: PEN, COP, ARS)'
    },
    currency: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Nombre de la moneda (ej: Sol Peruano, Peso Colombiano)'
    },
    currency_simbol: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'Símbolo de la moneda (ej: S/, $, €)'
    },
    time_zone: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Zona horaria principal (ej: America/Lima, America/Bogota)'
    },
    language: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Código del idioma principal (ej: es, en, pt)'
    },
    date_format: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Formato de fecha preferido en el país'
    },
    flag_url: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'URL de la imagen de la bandera del país'
    },
    user_create: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que creó el registro'
    },
    user_update: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que actualizó el registro'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Si el país está activo — solo los activos se ofrecen en selectores públicos'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_country',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla que almacena información de países donde opera el sistema',
    indexes: [
        { name: 'idx_country_iso_unique', unique: true, fields: ['iso_country'] },
        { name: 'idx_country_language', fields: ['language'] }
    ]
});

// TODO: wire Country→Company cuando se porte `companys` (hasMany, foreignKey country_id).
export function associateCountry(models: { Ubigeo: typeof Ubigeo; PaymentType: typeof PaymentType }): void {
    Country.hasMany(models.Ubigeo, { foreignKey: 'country_id', as: 'ubigeos' });
    Country.hasMany(models.PaymentType, { foreignKey: 'country_id', as: 'paymentTypes' });
}
