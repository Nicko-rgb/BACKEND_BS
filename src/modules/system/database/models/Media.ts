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
import { idPublicId } from '../../../../shared/utils/ids';
import type { User } from '../../../users/database/models';
import type { Company } from '../../../companys/database/models';
import type { Space } from '../../../companys/database/models';

// Mapa central — única fuente de verdad. Agregar un valor acá (sin migración,
// la columna es VARCHAR) y Joi + service lo toman solo.
export const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const MEDIA_CATEGORIES = ['GALLERY', 'PROFILE', 'COVER', 'THUMBNAIL', 'DOCUMENT'] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];


export class Media extends Model<InferAttributes<Media>, InferCreationAttributes<Media>> {
    declare media_id: CreationOptional<number>;
    declare medible_id: number;
    declare medible_type: string;
    declare tenant_id: string | null;
    declare public_id: CreationOptional<string>;
    declare type: CreationOptional<string>;
    declare category: CreationOptional<string>;
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
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Tenant de la entidad dueña — NULL para assets globales sin tenant'
    },
    public_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: () => idPublicId(),
        comment: 'Identificador público único por fila — lo único expuesto en URLs'
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'IMAGE',
        comment: 'Tipo de archivo multimedia'
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'GALLERY',
        comment: 'Categoría del archivo multimedia'
    },
    file_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
        comment: 'URL del archivo — única por fila (1:1 fila↔archivo)'
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
        { name: 'idx_media_polymorphic', fields: ['medible_id', 'medible_type'] },
        { unique: true, name: 'unique_media_public_id', fields: ['public_id'] }
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
