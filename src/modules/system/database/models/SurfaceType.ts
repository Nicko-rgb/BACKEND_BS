/**
 * Modelo SurfaceType - Catálogo de tipos de superficie
 * Tabla de catálogo usada para clasificar las características de los espacios.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

export class SurfaceType extends Model<InferAttributes<SurfaceType>, InferCreationAttributes<SurfaceType>> {
    declare surface_type_id: CreationOptional<number>;
    declare code: string;
    declare name: string;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

SurfaceType.init({
    surface_type_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del tipo de superficie'
    },
    code: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: 'Código único del tipo de superficie'
    },
    name: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'Nombre del tipo de superficie'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_surface_type',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Catálogo de tipos de superficie',
    indexes: [{ unique: true, fields: ['code'] }]
});

// TODO: wire SurfaceType→Space cuando se porte `companys` (hasMany, foreignKey surface_type_id).
