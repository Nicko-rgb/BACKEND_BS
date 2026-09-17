/**
 * PasswordResetToken - Tokens de recuperación de contraseña
 * Guarda solo el hash SHA-256 del token enviado por email; de un solo uso (`used_at`) y con vencimiento.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from '../../../users/database/models';

export class PasswordResetToken extends Model<InferAttributes<PasswordResetToken>, InferCreationAttributes<PasswordResetToken>> {
    declare reset_token_id: CreationOptional<number>;
    declare user_id: number;
    declare token_hash: string;
    declare expires_at: Date;
    declare used_at: Date | null;
    declare readonly created_at: CreationOptional<Date>;

    declare user?: NonAttribute<User>;
}

PasswordResetToken.init({
    reset_token_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del token'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario dueño del token'
    },
    token_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'SHA-256 (hex) del token enviado por email — nunca el token en claro'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Fecha de vencimiento del token'
    },
    used_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha en que se usó o invalidó — null mientras siga vigente'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de creación del token'
    }
}, {
    sequelize,
    tableName: 'dsg_bss_password_reset_token',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        { name: 'idx_password_reset_token_user_id', fields: ['user_id'] }
    ],
    comment: 'Tokens de recuperación de contraseña'
});

export function associatePasswordResetToken(models: { User: typeof User }): void {
    PasswordResetToken.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
}
