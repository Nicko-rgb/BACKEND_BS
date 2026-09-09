/**
 * Modelo MenuItem — Ítems del menú de navegación (dinámico)
 *
 * Permite que el menú de AppAdmin se cargue desde la base de datos. Qué rol
 * ve cada ítem se decide por dsg_bss_role_menu_item (modelo RoleMenuItem),
 * no por una columna acá — ver menu.service.ts::getMenuForUser.
 *
 * Sin asociaciones propias — tabla de configuración independiente.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

type AppAccess = 'admin' | 'booking' | 'both';

export class MenuItem extends Model<InferAttributes<MenuItem>, InferCreationAttributes<MenuItem>> {
    declare menu_id: CreationOptional<number>;
    declare key: string;
    declare label: string;
    declare icon: string | null;
    declare path: string | null;
    declare parent_key: string | null;
    declare app_access: CreationOptional<AppAccess>;
    declare group_title: string | null;
    declare sort_order: CreationOptional<number>;
    declare is_active: CreationOptional<boolean>;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

MenuItem.init({
    menu_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    key: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Identificador único del ítem (ej: dashboard, bookings)',
    },
    label: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Texto visible en la UI',
    },
    icon: {
        type: DataTypes.STRING(80),
        allowNull: true,
        comment: 'Nombre del ícono (Lucide o react-icons)',
    },
    path: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Ruta del router (ej: /bookings)',
    },
    parent_key: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Clave del ítem padre (NULL = menú raíz)',
    },
    app_access: {
        type: DataTypes.ENUM('admin', 'booking', 'both'),
        allowNull: false,
        defaultValue: 'admin',
    },
    group_title: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Grupo de sección en el sidebar (GENERAL, SUPPORT, CONFIG)',
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden de aparición dentro del grupo',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    sequelize,
    tableName: 'dsg_bss_menu_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['app_access', 'is_active'], name: 'idx_menu_app_active' },
        { fields: ['group_title', 'sort_order'], name: 'idx_menu_group_order' },
    ],
    comment: 'Ítems de menú dinámico para el panel de administración',
});
