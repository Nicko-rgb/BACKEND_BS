/**
 * Modelo District (legacy) — reemplazado por Ubigeo, se mantiene por compatibilidad.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { Province } from './Province';

export class District extends Model<InferAttributes<District>, InferCreationAttributes<District>> {
    declare dept_code: string;
    declare prov_code: string;
    declare dist_code: string;
    declare name: string;
    declare ubigeo6: string | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

District.init({
    dept_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        comment: 'Código del departamento'
    },
    prov_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        comment: 'Código de la provincia'
    },
    dist_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        comment: 'Código único del distrito'
    },
    name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        comment: 'Nombre del distrito'
    },
    ubigeo6: {
        type: DataTypes.CHAR(30),
        allowNull: true,
        comment: 'Código ubigeo generado automáticamente (dept_code + prov_code + dist_code)'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_district',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla de distritos por provincia'
});

export function associateDistrict(models: { Province: typeof Province }): void {
    District.belongsTo(models.Province, { foreignKey: ['dept_code', 'prov_code'] as any, as: 'province' });
}
