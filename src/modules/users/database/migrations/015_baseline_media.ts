/**
 * Baseline: crear tabla dsg_bss_media
 * Almacenamiento polimórfico de archivos multimedia.
 *
 * Vive en `users/database/migrations/` (no en `system`, donde vive el modelo
 * Media) porque tiene FK dura a dsg_bss_user (user_create/user_update),
 * creada por la migración 012 (order: 12). El orden real de ejecución lo
 * define `meta.order` (acá: 15) de forma global, sin importar en qué
 * carpeta viva el archivo — la carpeta es solo organizativa, para que quede
 * junto a la migración de la que depende en vez de junto a su modelo.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_media',
        module: 'users',
        order: 15
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_media') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_media ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_media', {
            media_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            medible_id: { type: DataTypes.BIGINT, allowNull: false },
            medible_type: { type: DataTypes.STRING(50), allowNull: false },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false },
            type: {
                type: DataTypes.ENUM('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'),
                defaultValue: 'IMAGE'
            },
            category: {
                type: DataTypes.ENUM('GALLERY', 'PROFILE', 'COVER', 'THUMBNAIL', 'DOCUMENT'),
                defaultValue: 'GALLERY'
            },
            file_url: { type: DataTypes.STRING(500), allowNull: false },
            file_name: { type: DataTypes.STRING(255), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
            user_create: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_update: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_media', ['tenant_id'], { name: 'idx_media_tenant' });
        await queryInterface.addIndex('dsg_bss_media', ['medible_id', 'medible_type'], { name: 'idx_media_polymorphic' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_media');
    }
};

module.exports = migration;
