/**
 * Baseline: crear tabla dsg_bss_person
 * Datos personales extendidos de un usuario.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_person',
        module: 'users',
        order: 13
    },

    async up(queryInterface, sequelize) {
        const [rows]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_person') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_person ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_person', {
            persona_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            country_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_country', key: 'country_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            date_birth: { type: DataTypes.DATEONLY, allowNull: true },
            gender: {
                type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED'),
                allowNull: true
            },
            document_type: {
                type: DataTypes.ENUM('IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER'),
                allowNull: true
            },
            document_number: { type: DataTypes.STRING(50), allowNull: true },
            phone: { type: DataTypes.STRING(20), allowNull: true },
            // Ubigeo de residencia — no dirección libre: así se puede buscar sucursales cercanas
            // igual que dsg_bss_company.ubigeo_id. Solo lo usa el portal cliente (booking).
            ubigeo_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_ubigeo', key: 'ubigeo_id' },
                onDelete: 'SET NULL'
            },
            occupation: { type: DataTypes.STRING(100), allowNull: true },
            civil_state: {
                type: DataTypes.ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COMMON-LAW'),
                allowNull: true
            },
            sports_preferences: { type: DataTypes.JSON, allowNull: true },
            accept_marketing: { type: DataTypes.BOOLEAN, defaultValue: false },
            // Notificaciones/privacidad/pantalla — settings sueltos sin necesidad relacional, JSONB
            // (no JSON como sports_preferences) para poder indexar/filtrar más adelante si hace falta.
            preferences: { type: DataTypes.JSONB, allowNull: true },
            // FK real (a diferencia de preferences): permite JOIN. ON DELETE SET NULL — si el tipo
            // de pago se borra, la preferencia se limpia sola en vez de bloquear el borrado.
            default_payment_type_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_payment_types', key: 'payment_type_id' },
                onDelete: 'SET NULL'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_person', ['user_id'], { unique: true, name: 'idx_person_user_id_unique' });
        await queryInterface.addIndex('dsg_bss_person', ['document_number'], { name: 'idx_person_document_number' });
        await queryInterface.addIndex('dsg_bss_person', ['country_id'], { name: 'idx_person_country_id' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_person');
    }
};

module.exports = migration;
