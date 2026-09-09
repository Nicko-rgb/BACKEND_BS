/**
 * Modelo Department (legacy) — reemplazado por Ubigeo, se mantiene por compatibilidad.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { Country } from './Country';
import type { Province } from './Province';

export class Department extends Model<InferAttributes<Department>, InferCreationAttributes<Department>> {
    declare dept_code: string;
    declare country_id: number;
    declare name: string;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

Department.init({
    dept_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        comment: 'Código único del departamento'
    },
    country_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_country', key: 'country_id' },
        comment: 'ID del país al que pertenece el departamento'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del departamento'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_department',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla de departamentos/estados por país'
});

export function associateDepartment(models: { Country: typeof Country; Province: typeof Province }): void {
    Department.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });
    Department.hasMany(models.Province, { foreignKey: 'dept_code', sourceKey: 'dept_code', as: 'provinces' });
}
