/**
 * Migración: migrate_user_tabla
 * Módulo: users
 * Creada: 2026-11-07T21:52:08.583Z
 *
 * Unifica `dsg_bss_person` dentro de `dsg_bss_user` (relación 1:1) y elimina la
 * tabla de personas. De `person` solo se rescatan `country_id`, `phone` y
 * `date_birth`; el resto de columnas nuevas queda en NULL para los registros
 * existentes.
 *
 * `first_name` y `last_name` pasan a NOT NULL — los registros viejos sin nombre
 * se normalizan a cadena vacía para que el ALTER no falle.
 */
import { DataTypes } from 'sequelize';
import type { QueryInterface, Sequelize, Transaction } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'migrate user tabla',
        module: 'users',
        order: 50
    },

    async up(queryInterface: QueryInterface, sequelize: Sequelize, transaction: Transaction) {
        // 1. Perfil que antes vivía en dsg_bss_person ───────────────────────────
        await queryInterface.addColumn('dsg_bss_user', 'country_id', {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'dsg_bss_country', key: 'country_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'País del usuario',
        }, { transaction });

        await queryInterface.addColumn('dsg_bss_user', 'date_birth', {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Fecha de nacimiento',
        }, { transaction });

        await queryInterface.addColumn('dsg_bss_user', 'gender', {
            type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED'),
            allowNull: true,
            comment: 'Género del usuario',
        }, { transaction });

        await queryInterface.addColumn('dsg_bss_user', 'document_type', {
            type: DataTypes.ENUM('IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER'),
            allowNull: true,
            comment: 'Tipo de documento de identidad',
        }, { transaction });

        await queryInterface.addColumn('dsg_bss_user', 'document_number', {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Número del documento de identidad',
        }, { transaction });

        await queryInterface.addColumn('dsg_bss_user', 'phone', {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'Número de teléfono del usuario',
        }, { transaction });

        await queryInterface.addColumn('dsg_bss_user', 'ubigeo_id', {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'dsg_bss_ubigeo', key: 'ubigeo_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'Ubigeo de residencia',
        }, { transaction });

        await queryInterface.addColumn('dsg_bss_user', 'preferences', {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Preferencias de notificaciones, privacidad y pantalla',
        }, { transaction });

        await queryInterface.addColumn('dsg_bss_user', 'default_payment_type_id', {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'dsg_bss_payment_types', key: 'payment_type_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'Tipo de pago preferido del usuario',
        }, { transaction });

        await queryInterface.addColumn('dsg_bss_user', 'source_from', {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Origen del registro (web, admin, booking, etc.)',
        }, { transaction });

        // 2. Rescatar los únicos datos de person que pide el contrato nuevo ─────
        const [personTable]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_person') IS NOT NULL AS exists`, { transaction }
        );

        if (personTable[0].exists) {
            await sequelize.query(`
                UPDATE dsg_bss_user AS u
                SET country_id = p.country_id,
                    phone = p.phone,
                    date_birth = p.date_birth
                FROM dsg_bss_person AS p
                WHERE p.user_id = u.user_id
            `, { transaction });
        }

        // 3. Nombres obligatorios — normaliza nulos antes del ALTER ─────────────
        await sequelize.query(`
            UPDATE dsg_bss_user
            SET first_name = COALESCE(first_name, ''),
                last_name = COALESCE(last_name, '')
            WHERE first_name IS NULL OR last_name IS NULL
        `, { transaction });

        await queryInterface.changeColumn('dsg_bss_user', 'first_name', {
            type: DataTypes.STRING(100),
            allowNull: false,
        }, { transaction });

        await queryInterface.changeColumn('dsg_bss_user', 'last_name', {
            type: DataTypes.STRING(100),
            allowNull: false,
        }, { transaction });

        // 4. Índices que antes vivían en person ──────────────────────────────────
        await queryInterface.addIndex('dsg_bss_user', ['country_id'], {
            transaction,
            name: 'idx_user_country_id',
        });
        await queryInterface.addIndex('dsg_bss_user', ['document_number'], {
            transaction,
            name: 'idx_user_document_number',
        });

        // 5. Eliminar person y sus tipos ENUM huérfanos ──────────────────────────
        if (personTable[0].exists) {
            await queryInterface.dropTable('dsg_bss_person', { transaction });
        }

        await sequelize.query('DROP TYPE IF EXISTS "enum_dsg_bss_person_gender"', { transaction });
        await sequelize.query('DROP TYPE IF EXISTS "enum_dsg_bss_person_document_type"', { transaction });
        await sequelize.query('DROP TYPE IF EXISTS "enum_dsg_bss_person_civil_state"', { transaction });
    },

    async down(queryInterface: QueryInterface, sequelize: Sequelize, transaction: Transaction) {
        // 1. Los nombres vuelven a aceptar NULL ─────────────────────────────────
        await queryInterface.changeColumn('dsg_bss_user', 'first_name', {
            type: DataTypes.STRING(100),
            allowNull: true,
        }, { transaction });

        await queryInterface.changeColumn('dsg_bss_user', 'last_name', {
            type: DataTypes.STRING(100),
            allowNull: true,
        }, { transaction });

        // 2. Recrear dsg_bss_person con su esquema original ─────────────────────
        const [personTable]: any = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_person') IS NOT NULL AS exists`, { transaction }
        );

        if (!personTable[0].exists) {
            await queryInterface.createTable('dsg_bss_person', {
                persona_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
                user_id: {
                    type: DataTypes.BIGINT,
                    allowNull: false,
                    references: { model: 'dsg_bss_user', key: 'user_id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                country_id: {
                    type: DataTypes.BIGINT,
                    allowNull: false,
                    references: { model: 'dsg_bss_country', key: 'country_id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                },
                date_birth: { type: DataTypes.DATEONLY, allowNull: true },
                gender: {
                    type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED'),
                    allowNull: true,
                },
                document_type: {
                    type: DataTypes.ENUM('IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER'),
                    allowNull: true,
                },
                document_number: { type: DataTypes.STRING(50), allowNull: true },
                phone: { type: DataTypes.STRING(20), allowNull: true },
                ubigeo_id: {
                    type: DataTypes.BIGINT,
                    allowNull: true,
                    references: { model: 'dsg_bss_ubigeo', key: 'ubigeo_id' },
                    onDelete: 'SET NULL',
                },
                occupation: { type: DataTypes.STRING(100), allowNull: true },
                civil_state: {
                    type: DataTypes.ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COMMON-LAW'),
                    allowNull: true,
                },
                sports_preferences: { type: DataTypes.JSON, allowNull: true },
                accept_marketing: { type: DataTypes.BOOLEAN, defaultValue: false },
                preferences: { type: DataTypes.JSONB, allowNull: true },
                default_payment_type_id: {
                    type: DataTypes.BIGINT,
                    allowNull: true,
                    references: { model: 'dsg_bss_payment_types', key: 'payment_type_id' },
                    onDelete: 'SET NULL',
                },
                created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
                updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            }, { transaction });

            await queryInterface.addIndex('dsg_bss_person', ['user_id'], {
                transaction,
                unique: true,
                name: 'idx_person_user_id_unique',
            });
            await queryInterface.addIndex('dsg_bss_person', ['document_number'], {
                transaction,
                name: 'idx_person_document_number',
            });
            await queryInterface.addIndex('dsg_bss_person', ['country_id'], {
                transaction,
                name: 'idx_person_country_id',
            });

            // Solo los usuarios con país pueden volver a person (country_id NOT NULL).
            await sequelize.query(`
                INSERT INTO dsg_bss_person (
                    user_id, country_id, date_birth, gender, document_type, document_number,
                    phone, ubigeo_id, occupation, civil_state, sports_preferences,
                    accept_marketing, preferences, default_payment_type_id,
                    created_at, updated_at
                )
                SELECT
                    u.user_id, u.country_id, u.date_birth, u.gender, u.document_type, u.document_number,
                    u.phone, u.ubigeo_id, NULL, NULL, NULL,
                    false, u.preferences, u.default_payment_type_id,
                    u.created_at, u.updated_at
                FROM dsg_bss_user AS u
                WHERE u.country_id IS NOT NULL
            `, { transaction });
        }

        // 3. Quitar columnas del perfil de user ─────────────────────────────────
        for (const column of [
            'country_id',
            'date_birth',
            'gender',
            'document_type',
            'document_number',
            'phone',
            'ubigeo_id',
            'preferences',
            'default_payment_type_id',
            'source_from',
        ]) {
            await queryInterface.removeColumn('dsg_bss_user', column, { transaction });
        }

        await sequelize.query('DROP TYPE IF EXISTS "enum_dsg_bss_user_gender"', { transaction });
        await sequelize.query('DROP TYPE IF EXISTS "enum_dsg_bss_user_document_type"', { transaction });
    }
};

module.exports = migration;
