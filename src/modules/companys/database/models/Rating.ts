/**
 * Modelo Rating - Gestión de calificaciones y reseñas
 *
 * Almacena las calificaciones y comentarios que los usuarios realizan
 * sobre las instalaciones deportivas después de usar sus servicios.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from '../../../users/database/models';
import type { Company } from './Company';

type RatingStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'reportada';

export class Rating extends Model<InferAttributes<Rating>, InferCreationAttributes<Rating>> {
    declare rating_id: CreationOptional<number>;
    declare user_id: number;
    declare sucursal_id: number;
    declare booking_id: number | null;
    declare score: number;
    declare title: string | null;
    declare comment: string | null;
    declare pros: string | null;
    declare cons: string | null;
    declare would_recommend: boolean | null;
    declare status: CreationOptional<RatingStatus>;
    declare moderated_by: number | null;
    declare moderated_at: Date | null;
    declare rated_at: CreationOptional<Date>;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

Rating.init({
    rating_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la calificación'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'ID del usuario que realiza la calificación'
    },
    sucursal_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_company', key: 'company_id' },
        comment: 'ID de la sucursal deportiva calificada'
    },
    booking_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'ID de la reserva asociada a la calificación'
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 },
        comment: 'Puntuación de 1 a 5 estrellas'
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Título de la reseña'
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Comentario detallado del usuario'
    },
    pros: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Aspectos positivos mencionados'
    },
    cons: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Aspectos negativos mencionados'
    },
    would_recommend: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        comment: 'Si recomendaría la instalación'
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada', 'reportada'),
        defaultValue: 'pendiente',
        comment: 'Estado de moderación de la reseña, pendiente del administrador'
    },
    moderated_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'ID del moderador que revisó la reseña',
        references: { model: 'dsg_bss_user', key: 'user_id' }
    },
    moderated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de moderación'
    },
    rated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de creación de la calificación'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_ratings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla de calificaciones y reseñas sobre sucursales o reservas',
    indexes: [
        // Índice compuesto para listar reseñas aprobadas de una sucursal ──────────────
        { name: 'idx_rating_sucursal_status', fields: ['sucursal_id', 'status'] },
        { name: 'idx_rating_user_id', fields: ['user_id'] },
        { name: 'idx_rating_booking_id', fields: ['booking_id'] }
    ]
});

// NOTA: Rating→Booking (belongsTo) se wirea desde `bookings/database/models/index.ts`
// — `companys` no puede importar `bookings` sin crear una dependencia circular
// (bookings ya importa companys).
export function associateRating(models: { User: typeof User; Company: typeof Company }): void {
    Rating.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Rating.belongsTo(models.Company, { foreignKey: 'sucursal_id', as: 'sucursal' });
}
