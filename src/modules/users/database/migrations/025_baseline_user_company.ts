/**
 * Baseline: crear tabla dsg_bss_user_company
 * Relación usuario-empresa con rol y tenant. Vive en `users/` porque el
 * modelo UserCompany pertenece a este módulo, aunque su FK depende de
 * dsg_bss_company (creada por `companys`, migración 017 — order: 17, mayor
 * al de esta migración, order: 25, así que ya existe cuando corre). La FK
 * apunta por nombre de tabla, no requiere que el modelo Company exista en TS.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_user_company',
        module: 'users',
        order: 25
    },

    async up(queryInterface, sequelize) {
        // Seguro en producción: no crea si ya existe ──────────────────────────
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_user_company') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_user_company ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_user_company', {
            user_company_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            company_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            role: { type: DataTypes.STRING(50), allowNull: false },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            created_by: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_user_company', ['user_id', 'company_id'], { unique: true, name: 'unique_user_company' });
        await queryInterface.addIndex('dsg_bss_user_company', ['user_id'], { name: 'idx_user_company_user' });
        await queryInterface.addIndex('dsg_bss_user_company', ['company_id'], { name: 'idx_user_company_company' });
        await queryInterface.addIndex('dsg_bss_user_company', ['tenant_id'], { name: 'idx_user_company_tenant' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_user_company');
    }
};

module.exports = migration;
