/**
 * Baseline: crear tabla dsg_bss_media
 * Almacenamiento polimórfico de archivos multimedia.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';
import { idPublicId } from '../../../../shared/utils/ids';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_media',
        module: 'system',
        order: 15
    },

    async up(queryInterface, sequelize, transaction) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_media') IS NOT NULL AS exists`, { transaction }
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_media ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_media', {
            media_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            medible_id: { type: DataTypes.BIGINT, allowNull: false },
            medible_type: { type: DataTypes.STRING(50), allowNull: false },
            tenant_id: { type: DataTypes.UUID, allowNull: true, comment: 'Tenant de la entidad dueña — NULL para assets globales sin tenant' },
            public_id: { type: DataTypes.UUID, allowNull: false, unique: true, defaultValue: () => idPublicId(), comment: 'Identificador público único por fila — lo único expuesto en URLs' },
            type: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'IMAGE'
            },
            category: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: 'GALLERY'
            },
            file_url: { type: DataTypes.STRING(500), allowNull: false, unique: true, comment: 'URL del archivo — única por fila (1:1 fila↔archivo)' },
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
        }, { transaction });

        await queryInterface.addIndex('dsg_bss_media', ['tenant_id'], { transaction, name: 'idx_media_tenant' });
        await queryInterface.addIndex('dsg_bss_media', ['medible_id', 'medible_type'], { transaction, name: 'idx_media_polymorphic' });
        await queryInterface.addIndex('dsg_bss_media', ['public_id'], { transaction, unique: true, name: 'unique_media_public_id' });
    },

    async down(queryInterface, _sequelize, transaction) {
        await queryInterface.dropTable('dsg_bss_media', { transaction });
    }
};

module.exports = migration;
