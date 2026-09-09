/**
 * Modelo UserPageTour — Seguimiento del onboarding por página
 *
 * Registra si un usuario completó el tour de cada página del admin.
 * Un registro por (user_id, page_key). Si no existe el registro para
 * una página, significa que el tour aún no fue iniciado.
 *
 * page_key ejemplos: 'page_dashboard', 'page_company', 'page_reservas',
 *                    'page_canchas', 'page_empleados'
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from './User';

export class UserPageTour extends Model<InferAttributes<UserPageTour>, InferCreationAttributes<UserPageTour>> {
    declare user_id: number;
    declare page_key: string;
    declare completed: CreationOptional<boolean>;
    declare completed_at: Date | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

UserPageTour.init({
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'FK al usuario dueño del registro',
    },
    page_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        primaryKey: true,
        comment: 'Identificador de la página del admin (page_company, page_reservas, etc.)',
    },
    completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'true cuando el usuario completó todos los pasos del tour en esta página',
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp en que se marcó el tour como completado',
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
    tableName: 'dsg_bss_user_page_tour',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['user_id'], name: 'idx_user_page_tour_user_id' },
    ],
});

export function associateUserPageTour(models: { User: typeof User }): void {
    UserPageTour.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
}
