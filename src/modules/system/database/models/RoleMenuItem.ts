/**
 * Modelo RoleMenuItem — Ítems de menú visibles para cada rol
 *
 * Reemplaza el filtrado de menú por `menu_items.required_permission` — ver
 * menu.service.ts::getMenuForUser. Se gestiona desde la propia página de
 * Menú (checkboxes de rol en el form de un ítem), no desde una pantalla
 * aparte.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

export class RoleMenuItem extends Model<InferAttributes<RoleMenuItem>, InferCreationAttributes<RoleMenuItem>> {
    declare role_menu_item_id: CreationOptional<number>;
    declare role_id: number;
    declare menu_id: number;
    declare readonly created_at: CreationOptional<Date>;
}

RoleMenuItem.init({
    role_menu_item_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    role_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_role', key: 'role_id' },
    },
    menu_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_menu_items', key: 'menu_id' },
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    sequelize,
    tableName: 'dsg_bss_role_menu_item',
    timestamps: false,
    indexes: [
        { unique: true, fields: ['role_id', 'menu_id'], name: 'unique_role_menu_item' },
        { fields: ['menu_id'], name: 'idx_role_menu_item_menu' },
    ],
    comment: 'Ítems de menú asignados a cada rol',
});
