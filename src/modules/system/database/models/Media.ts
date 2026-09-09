/**
 * Modelo Media - Gestión de archivos multimedia
 *
 * Almacena archivos multimedia (imágenes, videos) asociados de forma
 * polimórfica a compañías, espacios deportivos o usuarios, vía
 * medible_id/medible_type. Permite categorizar los medios y marcar
 * imágenes principales.
 *
 * Vive en `system` como catálogo compartido entre módulos, aunque su
 * migración (dsg_bss_media) vive en `users/database/migrations/` porque
 * tiene FK dura a dsg_bss_user (user_create/user_update) — ver ese archivo.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from '../../../users/database/models';
import type { Company } from '../../../companys/database/models';
import type { Space } from '../../../companys/database/models';

type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';
type MediaCategory = 'GALLERY' | 'PROFILE' | 'COVER' | 'THUMBNAIL' | 'DOCUMENT';

export class Media extends Model<InferAttributes<Media>, InferCreationAttributes<Media>> {
    declare media_id: CreationOptional<number>;
    declare medible_id: number;
    declare medible_type: string;
    declare tenant_id: string;
    declare type: CreationOptional<MediaType>;
    declare category: CreationOptional<MediaCategory>;
    declare file_url: string;
    declare file_name: string;
    declare description: string | null;
    declare is_primary: CreationOptional<boolean>;
    declare user_create: number;
    declare user_update: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

Media.init({
    media_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del archivo multimedia'
    },
    // Campos Polimórficos
    medible_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID del modelo relacionado (Company, Space, User, etc.)'
    },
    medible_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Tipo del modelo relacionado (nombre de la tabla o modelo)'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Identificador del tenant para multi-tenancy'
    },
    type: {
        type: DataTypes.ENUM('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'),
        defaultValue: 'IMAGE',
        comment: 'Tipo de archivo multimedia'
    },
    category: {
        type: DataTypes.ENUM('GALLERY', 'PROFILE', 'COVER', 'THUMBNAIL', 'DOCUMENT'),
        defaultValue: 'GALLERY',
        comment: 'Categoría del archivo multimedia'
    },
    file_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'URL del archivo multimedia'
    },
    file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nombre del archivo'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del archivo multimedia'
    },
    is_primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Indica si es la imagen principal'
    },
    user_create: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que creó el registro'
    },
    user_update: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que actualizó el registro'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_media',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    comment: 'Tabla de archivos multimedia',
    indexes: [
        { name: 'idx_media_tenant', fields: ['tenant_id'] },
        { name: 'idx_media_polymorphic', fields: ['medible_id', 'medible_type'] }
    ]
});

/**
 * Asociaciones de Media hacia Company/Space/User — se llama desde
 * `companys/database/models/index.ts` (último módulo en cargar), único punto
 * donde User (users), Company y Space (companys) están todos disponibles.
 */
export function associateMedia(models: { User: typeof User; Company: typeof Company; Space: typeof Space }): void {
    Media.belongsTo(models.Company, { foreignKey: 'medible_id', constraints: false, as: 'company' });
    Media.belongsTo(models.Space, { foreignKey: 'medible_id', constraints: false, as: 'space' });
    Media.belongsTo(models.User, { foreignKey: 'medible_id', constraints: false, as: 'medibleUser' });
    Media.belongsTo(models.User, { foreignKey: 'user_create', as: 'creator' });
    Media.belongsTo(models.User, { foreignKey: 'user_update', as: 'updater' });
}
