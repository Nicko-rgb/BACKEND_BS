/**
 * Modelo Company - Gestión de compañías deportivas
 *
 * Este modelo almacena información de las compañías que ofrecen
 * instalaciones deportivas. Cada compañía puede tener múltiples
 * espacios deportivos, horarios de funcionamiento y medios.
 *
 * Empresa y sucursal comparten esta misma tabla: si `parent_company_id`
 * es null es la empresa principal, si tiene valor es una sucursal.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User, UserFavorite, UserCompany } from '../../../users/database/models';
import type { Space } from './Space';
import type { Configuration } from './Configuration';
import type { ConfigurationPayment } from './ConfigurationPayment';
import type { Rating } from './Rating';
import type { Country, Ubigeo, Media } from '../../../system/database/models';

type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
type CompanyEnabled = 'A' | 'I' | 'P';

export class Company extends Model<InferAttributes<Company>, InferCreationAttributes<Company>> {
    declare company_id: CreationOptional<number>;
    declare country_id: number;
    declare tenant_id: string;
    declare name: string;
    declare address: string;
    declare ubigeo_id: number;
    declare phone_cell: string;
    declare phone: string | null;
    declare website: string | null;
    declare document: string;
    declare postal_code: string | null;
    declare latitude: string | null;
    declare longitude: string | null;
    declare status: CompanyStatus | null;
    declare description: string | null;
    declare parking_available: CreationOptional<boolean>;
    declare opening_time: string | null;
    declare closing_time: string | null;
    declare min_price: string | null;
    declare features: string | null;
    declare parent_company_id: number | null;
    declare is_enabled: CompanyEnabled | null;
    declare user_create: number;
    declare user_update: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    // Asociaciones (poblado por include, no columnas propias) ─────────────────
    declare userAssignments?: NonAttribute<UserCompany[]>;
    declare country?: NonAttribute<Country>;
    declare ubigeo?: NonAttribute<Ubigeo>;
    declare subsidiaries?: NonAttribute<Company[]>;
}

Company.init({
    company_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la compañía'
    },
    country_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_country', key: 'country_id' },
        comment: 'Referencia al país donde se ubica la compañía o sucursal'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Identificador del tenant para multi-tenancy'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre de la compañía o sucursal'
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Dirección completa de la compañía o sucursal'
    },
    ubigeo_id: {
        type: DataTypes.BIGINT,
        allowNull: false, // Nivel 3 (distrito/ciudad) obligatorio
        references: { model: 'dsg_bss_ubigeo', key: 'ubigeo_id' },
        comment: 'Nivel geográfico asignado — debe ser nivel 3 (distrito/ciudad)'
    },
    phone_cell: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Teléfono celular de contacto'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true, // Opcional — no todas las empresas tienen teléfono fijo
        comment: 'Teléfono fijo de contacto'
    },
    website: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Sitio web de la compañía'
    },
    document: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Número de documento de identificación fiscal (RUC del representante legal)'
    },
    postal_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Código postal'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Latitud de la ubicación'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitud de la ubicación'
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
        defaultValue: null,
        comment: 'Estado operativo de la sucursal — exclusivo de sucursales, null en empresa principal'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción de la compañía'
    },
    parking_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Indica si tiene estacionamiento disponible'
    },
    opening_time: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Horario de apertura (para sucursales)'
    },
    closing_time: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Horario de cierre (para sucursales)'
    },
    min_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Precio mínimo (para sucursales)'
    },
    features: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Características de la sucursal (separadas por comas)'
    },
    parent_company_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_company', key: 'company_id' },
        comment: 'Referencia a la compañía padre (para sucursales)'
    },
    is_enabled: {
        type: DataTypes.ENUM('A', 'I', 'P'),
        allowNull: true,
        comment: "Flag de habilitación — exclusivo de empresa principal, 'A'=Active, 'I'=Inactive, 'P'=Pending (pago SaaS pendiente)"
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
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_company',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    comment: 'Tabla de compañías y sucursales deportivas',
    indexes: [
        // Nota: sin UNIQUE global en 'document' — las sucursales heredan y comparten
        // el RUC/NIT de su empresa madre. La unicidad se valida en el Service,
        // solo para empresas padre (parent_company_id IS NULL).
        { name: 'idx_company_tenant_id', fields: ['tenant_id'] },
        { name: 'idx_company_country_id', fields: ['country_id'] },
        { name: 'idx_company_ubigeo_id', fields: ['ubigeo_id'] },
        { name: 'idx_company_parent_company_id', fields: ['parent_company_id'] },
        { name: 'idx_company_status_enabled', fields: ['status', 'is_enabled'] }
    ]
});

// NOTA: Company→SaaSSubscription (hasOne) y Company→Notification (hasMany)
// se wirean desde `saas/database/models/index.ts` y
// `notificacions/database/models/index.ts` respectivamente — `companys` no
// puede importar esos módulos sin crear una dependencia circular (ambos ya
// importan `companys`).
export function associateCompany(models: {
    User: typeof User;
    UserFavorite: typeof UserFavorite;
    UserCompany: typeof UserCompany;
    Space: typeof Space;
    Configuration: typeof Configuration;
    ConfigurationPayment: typeof ConfigurationPayment;
    Rating: typeof Rating;
    Country: typeof Country;
    Ubigeo: typeof Ubigeo;
    Media: typeof Media;
}): void {
    Company.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });
    Company.belongsTo(models.Ubigeo, { foreignKey: 'ubigeo_id', as: 'ubigeo' });
    Company.hasMany(models.Media, { foreignKey: 'medible_id', constraints: false, scope: { medible_type: 'Company' }, as: 'media' });
    // Auto-referencia para compañías padre/sucursales ─────────────────────────
    Company.belongsTo(Company, { 
        foreignKey: 'parent_company_id',
        as: 'parentCompany'
    });
    Company.hasMany(Company, {
        foreignKey: 'parent_company_id',
        as: 'subsidiaries'
    });

    Company.hasMany(models.Space, {
        foreignKey: 'sucursal_id',
        as: 'spaces'
    });
    Company.hasMany(models.ConfigurationPayment, {
        foreignKey: 'sucursal_id',
        as: 'paymentConfigurations'
    });
    Company.hasOne(models.Configuration, {
        foreignKey: 'company_id',
        as: 'configuration'
    });
    Company.hasMany(models.Rating, {
        foreignKey: 'sucursal_id',
        as: 'ratings'
    });
    Company.hasMany(models.UserFavorite, {
        foreignKey: 'sucursal_id',
        as: 'favoritedBy'
    });
    Company.hasMany(models.UserCompany, {
        foreignKey: 'company_id',
        as: 'userAssignments'
    });
    Company.belongsTo(models.User, {
        foreignKey: 'user_create',
        as: 'creator'
    });
    Company.belongsTo(models.User, {
        foreignKey: 'user_update',
        as: 'updater'
    });
}
