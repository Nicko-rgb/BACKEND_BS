/**
 * Baseline: crear tabla dsg_bss_saas_seguimiento
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_saas_seguimiento',
        module: 'saas',
        order: 39
    },

    async up(queryInterface) {
        await queryInterface.createTable('dsg_bss_saas_seguimiento', {
            seguimiento_id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            lead_uuid: {
                type: DataTypes.STRING(36),
                allowNull: false,
                unique: true,
                comment: 'UUID generado en el navegador al iniciar el checkout — clave de upsert'
            },
            last_step_reached: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: 'Último paso del wizard alcanzado (1, 2 o 3)'
            },

            // Empresa (paso 1)
            company_name: { type: DataTypes.STRING(200), allowNull: true },
            company_document: { type: DataTypes.STRING(20), allowNull: true },
            company_address: { type: DataTypes.STRING(255), allowNull: true },
            company_phone: { type: DataTypes.STRING(20), allowNull: true },
            country_id: { type: DataTypes.BIGINT, allowNull: true },
            ubigeo_id: { type: DataTypes.BIGINT, allowNull: true },

            // Dueño (paso 2) — nunca se guarda password acá
            first_name: { type: DataTypes.STRING(100), allowNull: true },
            last_name: { type: DataTypes.STRING(100), allowNull: true },
            email: { type: DataTypes.STRING(100), allowNull: true },
            owner_phone: { type: DataTypes.STRING(20), allowNull: true },

            // Plan de interés
            plan_id: { type: DataTypes.BIGINT, allowNull: true },
            plan_code: { type: DataTypes.STRING(30), allowNull: true },
            billing_period: { type: DataTypes.STRING(10), allowNull: true },

            // Datos pasivos — sin pedir permisos del navegador
            utm_source: { type: DataTypes.STRING(100), allowNull: true },
            utm_medium: { type: DataTypes.STRING(100), allowNull: true },
            utm_campaign: { type: DataTypes.STRING(100), allowNull: true },
            referrer: { type: DataTypes.STRING(255), allowNull: true },
            language: { type: DataTypes.STRING(10), allowNull: true },
            timezone: { type: DataTypes.STRING(50), allowNull: true },
            user_agent: { type: DataTypes.STRING(255), allowNull: true },

            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_saas_seguimiento');
    }
};

module.exports = migration;
