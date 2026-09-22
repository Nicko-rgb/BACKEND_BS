/**
 * Baseline: crear tabla dsg_bss_space
 * Espacios deportivos (canchas, pistas) de una sucursal.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_space',
        module: 'companys',
        order: 18
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_space') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_space ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_space', {
            space_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            sucursal_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false, comment: 'Tenant raíz heredado de la sucursal/empresa — se duplica' },
            public_id: { type: DataTypes.STRING(36), allowNull: false, unique: true, comment: 'Identificador público único por fila — lo único expuesto en URLs' },
            name: { type: DataTypes.STRING(100), allowNull: false },
            surface_type_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_surface_type', key: 'surface_type_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            sport_type_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_sport_type', key: 'sport_type_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            sport_category_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_sport_category', key: 'sport_category_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            status_space: {
                type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
                allowNull: false
            },
            description: { type: DataTypes.TEXT, allowNull: true },
            capacity: { type: DataTypes.INTEGER, allowNull: true },
            dimensions: { type: DataTypes.STRING(100), allowNull: false },
            equipment: { type: DataTypes.TEXT, allowNull: true },
            minimum_booking_minutes: { type: DataTypes.INTEGER, defaultValue: 60 },
            maximum_booking_minutes: { type: DataTypes.INTEGER, defaultValue: 480 },
            booking_buffer_minutes: { type: DataTypes.INTEGER, defaultValue: 15 },
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

        await queryInterface.addIndex('dsg_bss_space', ['sucursal_id'], { name: 'idx_space_sucursal' });
        await queryInterface.addIndex('dsg_bss_space', ['surface_type_id'], { name: 'idx_space_surface_type' });
        await queryInterface.addIndex('dsg_bss_space', ['sport_category_id'], { name: 'idx_space_sport_category' });
        await queryInterface.addIndex('dsg_bss_space', ['sport_type_id'], { name: 'idx_space_sport_type' });
        await queryInterface.addIndex('dsg_bss_space', ['tenant_id'], { name: 'idx_space_tenant' });
        await queryInterface.addIndex('dsg_bss_space', ['public_id'], { unique: true, name: 'unique_space_public_id' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_space');
    }
};

module.exports = migration;
