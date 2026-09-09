/**
 * Modelo Space - Gestión de espacios deportivos
 *
 * Cada espacio pertenece a una sucursal (Company con parent_company_id)
 * y tiene características específicas como tipo de superficie, deporte,
 * capacidad y tarifas.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from '../../../users/database/models';
import type { Company } from './Company';
import type { BusinessHour } from './BusinessHour';
import type { SurfaceType, SportType, SportCategory, Media } from '../../../system/database/models';

type SpaceStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export class Space extends Model<InferAttributes<Space>, InferCreationAttributes<Space>> {
    declare space_id: CreationOptional<number>;
    declare sucursal_id: number;
    declare tenant_id: string;
    declare name: string;
    declare surface_type_id: number;
    declare sport_type_id: number;
    declare sport_category_id: number;
    declare status_space: SpaceStatus;
    declare description: string | null;
    declare capacity: number | null;
    declare dimensions: string;
    declare equipment: string | null;
    declare minimum_booking_minutes: CreationOptional<number>;
    declare maximum_booking_minutes: CreationOptional<number>;
    declare booking_buffer_minutes: CreationOptional<number>;
    declare user_create: number;
    declare user_update: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

Space.init({
    space_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del espacio deportivo'
    },
    sucursal_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_company', key: 'company_id' },
        comment: 'Referencia a la sucursal específica'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Identificador del tenant para multi-tenancy'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del espacio deportivo'
    },
    surface_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_surface_type', key: 'surface_type_id' },
        comment: 'Tipo de superficie del espacio'
    },
    sport_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_sport_type', key: 'sport_type_id' },
        comment: 'Tipo de deporte principal'
    },
    sport_category_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_sport_category', key: 'sport_category_id' },
        comment: 'Categoría deportiva'
    },
    status_space: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
        allowNull: false,
        comment: 'Estado del espacio deportivo'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del espacio deportivo'
    },
    capacity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Capacidad máxima de personas'
    },
    dimensions: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Dimensiones del espacio (ej: 20x40 metros)'
    },
    equipment: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Equipamientos del espacio deportivo (separadas por comas)'
    },
    minimum_booking_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 60,
        comment: 'Mínimo de minutos para reserva (ej: 60 para 1 hora)'
    },
    maximum_booking_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 480,
        comment: 'Máximo de minutos para reserva (ej: 480 para 8 horas)'
    },
    booking_buffer_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 15,
        comment: 'Minutos de buffer entre reservas'
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
    tableName: 'dsg_bss_space',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    comment: 'Tabla de espacios deportivos',
    indexes: [
        { name: 'idx_space_sucursal', fields: ['sucursal_id'] },
        { name: 'idx_space_surface_type', fields: ['surface_type_id'] },
        { name: 'idx_space_sport_category', fields: ['sport_category_id'] },
        { name: 'idx_space_sport_type', fields: ['sport_type_id'] },
        { name: 'idx_space_tenant', fields: ['tenant_id'] }
    ]
});

// NOTA: Space→Booking (hasMany) se wirea desde `bookings/database/models/index.ts`
// — `companys` no puede importar `bookings` sin crear una dependencia circular
// (bookings ya importa companys).
export function associateSpace(models: {
    User: typeof User;
    Company: typeof Company;
    BusinessHour: typeof BusinessHour;
    SurfaceType: typeof SurfaceType;
    SportType: typeof SportType;
    SportCategory: typeof SportCategory;
    Media: typeof Media;
}): void {
    Space.belongsTo(models.Company, { foreignKey: 'sucursal_id', as: 'sucursal' });
    Space.belongsTo(models.SurfaceType, { foreignKey: 'surface_type_id', as: 'surfaceType' });
    Space.belongsTo(models.SportType, { foreignKey: 'sport_type_id', as: 'sportType' });
    Space.belongsTo(models.SportCategory, { foreignKey: 'sport_category_id', as: 'sportCategory' });
    Space.hasMany(models.BusinessHour, { foreignKey: 'space_id', as: 'businessHours' });
    Space.hasMany(models.Media, { foreignKey: 'medible_id', constraints: false, scope: { medible_type: 'Space' }, as: 'media' });
    Space.belongsTo(models.User, { foreignKey: 'user_create', as: 'creator' });
    Space.belongsTo(models.User, { foreignKey: 'user_update', as: 'updater' });
}
