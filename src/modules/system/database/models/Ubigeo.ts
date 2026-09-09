/**
 * Modelo Ubigeo — tabla geográfica unificada y autorreferenciada
 * Almacena niveles geográficos de cualquier país (dept/estado, provincia, distrito, etc.)
 * Nivel 1 = Departamento/Estado, Nivel 2 = Provincia, Nivel 3 = Distrito
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import type { Country } from './Country';

export class Ubigeo extends Model<InferAttributes<Ubigeo>, InferCreationAttributes<Ubigeo>> {
    declare ubigeo_id: CreationOptional<number>;
    declare code: string;
    declare name: string;
    declare level: number;
    declare parent_id: number | null;
    declare country_id: number;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    // Asociaciones (pobladas por include, no columnas propias) ────────────────
    declare country?: NonAttribute<Country>;
    declare parent?: NonAttribute<Ubigeo>;
}

Ubigeo.init({
    ubigeo_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del registro geográfico'
    },
    code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Código geográfico: 2 dígitos dept, 4 dígitos prov, 6 dígitos dist'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del nivel geográfico'
    },
    level: {
        type: DataTypes.SMALLINT, // PostgreSQL no soporta TINYINT — usar SMALLINT
        allowNull: false,
        comment: '1=Departamento/Estado, 2=Provincia, 3=Distrito/Ciudad'
    },
    parent_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_ubigeo', key: 'ubigeo_id' },
        comment: 'Referencia al nivel geográfico padre (nulo para nivel 1)'
    },
    country_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_country', key: 'country_id' },
        comment: 'País al que pertenece este registro geográfico'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_ubigeo',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla geográfica unificada y autorreferenciada por niveles',
    indexes: [
        { name: 'idx_ubigeo_country_level', fields: ['country_id', 'level'] },
        { name: 'idx_ubigeo_parent_id', fields: ['parent_id'] },
        { name: 'idx_ubigeo_code', unique: true, fields: ['code'] }
    ]
});

// TODO: wire Ubigeo→Company cuando se porte `companys` (hasMany, foreignKey ubigeo_id).
export function associateUbigeo(models: { Country: typeof Country }): void {
    Ubigeo.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });
    Ubigeo.belongsTo(Ubigeo, { foreignKey: 'parent_id', as: 'parent' });
    Ubigeo.hasMany(Ubigeo, { foreignKey: 'parent_id', as: 'children' });
}
