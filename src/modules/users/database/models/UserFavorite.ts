/**
 * Modelo UserFavorite - Gestión de instalaciones favoritas por usuario
 *
 * Permite a los usuarios marcar instalaciones deportivas (sucursales)
 * como favoritas para un acceso rápido y seguimiento.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from './User';

export class UserFavorite extends Model<InferAttributes<UserFavorite>, InferCreationAttributes<UserFavorite>> {
    declare favorite_id: CreationOptional<number>;
    declare user_id: number;
    declare sucursal_id: number;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

UserFavorite.init({
    favorite_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del favorito'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'ID del usuario que marca como favorito'
    },
    sucursal_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_company', key: 'company_id' },
        comment: 'ID de la instalación (sucursal) marcada como favorita'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha en que se añadió a favoritos'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de última actualización'
    }
}, {
    sequelize,
    tableName: 'dsg_bss_user_favorites',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, fields: ['user_id', 'sucursal_id'], name: 'unique_user_sucursal_favorite' }
    ]
});

// TODO: wire UserFavorite→Company cuando se porte `companys`.
export function associateUserFavorite(models: { User: typeof User }): void {
    UserFavorite.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
}
