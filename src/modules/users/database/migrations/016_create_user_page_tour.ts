/**
 * Migración: crear tabla dsg_bss_user_page_tour
 * Registra si un usuario completó el tour de onboarding por página.
 * PK compuesta (user_id, page_key) — un registro por usuario por página.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Create dsg_bss_user_page_tour',
        module: 'users',
        order: 16
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_user_page_tour') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_user_page_tour ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_user_page_tour', {
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                primaryKey: true,
            },
            page_key: {
                type: DataTypes.STRING(100),
                allowNull: false,
                primaryKey: true,
                comment: 'Identificador de la página: page_company, page_reservas, etc.',
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
                comment: 'Timestamp en que se marcó como completado',
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
        });

        // Índice para consultar todos los tours de un usuario ─────────────────────────
        await queryInterface.addIndex('dsg_bss_user_page_tour', ['user_id'], {
            name: 'idx_user_page_tour_user_id',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_user_page_tour');
    },
};

module.exports = migration;
