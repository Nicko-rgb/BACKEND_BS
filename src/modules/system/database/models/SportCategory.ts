/**
 * Modelo SportCategory - Catálogo de categorías deportivas
 * Tabla de catálogo usada para clasificar los espacios deportivos.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

export class SportCategory extends Model<InferAttributes<SportCategory>, InferCreationAttributes<SportCategory>> {
    declare sport_category_id: CreationOptional<number>;
    declare code: string;
    declare name: string;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

SportCategory.init({
    sport_category_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la categoría deportiva'
    },
    code: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: 'Código único de la categoría deportiva'
    },
    name: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'Nombre de la categoría deportiva'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_sport_category',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Catálogo de categorías deportivas',
    indexes: [{ unique: true, fields: ['code'] }]
});

// TODO: wire SportCategory→Space cuando se porte `companys` (hasMany, foreignKey sport_category_id).
