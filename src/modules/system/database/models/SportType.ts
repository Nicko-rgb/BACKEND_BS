/**
 * Modelo SportType - Catálogo de tipos de deportes
 * Tabla de catálogo usada para clasificar los espacios deportivos.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

export class SportType extends Model<InferAttributes<SportType>, InferCreationAttributes<SportType>> {
    declare sport_type_id: CreationOptional<number>;
    declare code: string;
    declare name: string;
    declare is_active: CreationOptional<boolean>;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

SportType.init({
    sport_type_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del tipo de deporte'
    },
    code: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: 'Código único del tipo de deporte'
    },
    name: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'Nombre del tipo de deporte'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_sport_type',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Catálogo de tipos de deportes',
    indexes: [{ unique: true, fields: ['code'] }]
});

// TODO: wire SportType→Space cuando se porte `companys` (hasMany, foreignKey sport_type_id).
