/**
 * Modelo Province (legacy) — reemplazado por Ubigeo, se mantiene por compatibilidad.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { Department } from './Department';
import type { District } from './District';

export class Province extends Model<InferAttributes<Province>, InferCreationAttributes<Province>> {
    declare dept_code: string;
    declare prov_code: string;
    declare name: string;
    declare ubigeo4: string | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

Province.init({
    dept_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        references: { model: 'dsg_bss_department', key: 'dept_code' },
        comment: 'Código del departamento al que pertenece la provincia'
    },
    prov_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        comment: 'Código único de la provincia'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre de la provincia'
    },
    ubigeo4: {
        type: DataTypes.CHAR(20),
        allowNull: true,
        comment: 'Código ubigeo generado automáticamente (dept_code + prov_code)'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_province',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla de provincias por departamento'
});

export function associateProvince(models: { Department: typeof Department; District: typeof District }): void {
    Province.belongsTo(models.Department, { foreignKey: 'dept_code', targetKey: 'dept_code', as: 'department' });
    Province.hasMany(models.District, { foreignKey: ['dept_code', 'prov_code'] as any, as: 'districts' });
}
