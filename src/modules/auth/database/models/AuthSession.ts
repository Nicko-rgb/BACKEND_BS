import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

export class AuthSession extends Model<InferAttributes<AuthSession>, InferCreationAttributes<AuthSession>> {
    declare jti: string;
    declare user_id: number;
    declare expires_at: Date;
    declare revoked_at: Date | null;
    declare readonly created_at: CreationOptional<Date>;
}

AuthSession.init({
    jti: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    user_id: {
        type: DataTypes.BIGINT, allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
    },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
    sequelize,
    tableName: 'dsg_bss_auth_session',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        { name: 'idx_auth_session_user', fields: ['user_id'] },
        { name: 'idx_auth_session_expiration', fields: ['expires_at'] },
    ],
});
