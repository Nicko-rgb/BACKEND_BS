/**
 * Migración 055: acceso explícito por entidad.
 *
 * Remodela el alcance del usuario para que las tablas de asignación sean la única
 * fuente de verdad (sin herencia por rol ni por tenant):
 *   - `dsg_bss_company.owner_user_id`: dueño del tenant, único por grupo, declarado
 *     en la empresa primaria (reemplaza el `is_owner` de `dsg_bss_user_company`).
 *   - `dsg_bss_user_sucursal`: asignación explícita usuario ↔ sucursal.
 *   - `dsg_bss_user_company` queda como asignación usuario ↔ empresa raíz, sin `is_owner`.
 *
 * Recrea las funciones de integridad de 043 para mirar `owner_user_id` y sumar
 * `dsg_bss_user_sucursal` a los triggers diferidos.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Acceso explícito por entidad: owner_user_id + dsg_bss_user_sucursal',
        module: 'users',
        order: 55
    },

    async up(queryInterface, sequelize, transaction) {
        // 0. Quitar los triggers diferidos de 043. Sin ellos no quedan eventos de
        //    trigger pendientes dentro de la transacción, que es lo que bloquea el
        //    DDL posterior ("no se puede hacer CREATE INDEX ... porque tiene eventos
        //    de trigger pendientes"). Se recrean al final, ya con la lógica nueva.
        for (const table of ['dsg_bss_company', 'dsg_bss_user_company', 'dsg_bss_saas_subscription_company', 'dsg_bss_saas_subscriptions']) {
            await sequelize.query(`DROP TRIGGER IF EXISTS check_company_group_integrity ON ${table}`, { transaction });
        }

        // 1. Asignación usuario ↔ sucursal ────────────────────────────────────────
        await queryInterface.createTable('dsg_bss_user_sucursal', {
            user_sucursal_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            sucursal_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            tenant_id: { type: DataTypes.UUID, allowNull: false },
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
        }, { transaction });

        await queryInterface.addIndex('dsg_bss_user_sucursal', ['user_id', 'sucursal_id'], { transaction, unique: true, name: 'unique_user_sucursal' });
        await queryInterface.addIndex('dsg_bss_user_sucursal', ['user_id'], { transaction, name: 'idx_user_sucursal_user' });
        await queryInterface.addIndex('dsg_bss_user_sucursal', ['sucursal_id'], { transaction, name: 'idx_user_sucursal_sucursal' });
        await queryInterface.addIndex('dsg_bss_user_sucursal', ['tenant_id'], { transaction, name: 'idx_user_sucursal_tenant' });

        // 2. Dueño del tenant en la empresa primaria ──────────────────────────────
        await queryInterface.addColumn('dsg_bss_company', 'owner_user_id', {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'dsg_bss_user', key: 'user_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        }, { transaction });

        // 2.a Preservar los datos existentes: el dueño (is_owner) pasa a owner_user_id en su empresa.
        await sequelize.query(`
            UPDATE dsg_bss_company c SET owner_user_id = uc.user_id
            FROM dsg_bss_user_company uc
            WHERE uc.is_owner AND uc.company_id = c.company_id
        `, { transaction });

        // Un único dueño por tenant — garantizado por índice único parcial.
        await sequelize.query(
            'CREATE UNIQUE INDEX unique_company_tenant_owner ON dsg_bss_company (tenant_id) WHERE owner_user_id IS NOT NULL',
            { transaction }
        );

        // 2.b Las asignaciones existentes a sucursales pasan de user_company a user_sucursal.
        await sequelize.query(`
            INSERT INTO dsg_bss_user_sucursal (user_id, sucursal_id, tenant_id, is_active, created_by, created_at, updated_at)
            SELECT uc.user_id, uc.company_id, uc.tenant_id, uc.is_active, uc.created_by, uc.created_at, uc.updated_at
            FROM dsg_bss_user_company uc
            JOIN dsg_bss_company c ON c.company_id = uc.company_id
            WHERE c.parent_company_id IS NOT NULL AND NOT uc.is_owner
            ON CONFLICT DO NOTHING
        `, { transaction });
        await sequelize.query(`
            DELETE FROM dsg_bss_user_company uc
            USING dsg_bss_company c
            WHERE c.company_id = uc.company_id AND c.parent_company_id IS NOT NULL AND NOT uc.is_owner
        `, { transaction });

        // 2.c El dueño accedía a las sucursales a través de su empresa padre; ahora el
        //     acceso es explícito, así que se le auto-concede cada sucursal existente
        //     (mismo criterio que el alta de sucursal). Revocarlo luego es manual.
        await sequelize.query(`
            INSERT INTO dsg_bss_user_sucursal (user_id, sucursal_id, tenant_id, is_active, created_at, updated_at)
            SELECT o.owner_user_id, s.company_id, s.tenant_id, true, NOW(), NOW()
            FROM dsg_bss_company s
            JOIN dsg_bss_company o ON o.tenant_id = s.tenant_id AND o.parent_company_id IS NULL AND o.owner_user_id IS NOT NULL
            WHERE s.parent_company_id IS NOT NULL
            ON CONFLICT DO NOTHING
        `, { transaction });

        // 3. Dueño reemplaza el `is_owner` de user_company ────────────────────────
        await sequelize.query(`
            CREATE OR REPLACE FUNCTION validate_company_group(group_tenant uuid) RETURNS void LANGUAGE plpgsql AS $$
            DECLARE primary_id bigint; subscription_key bigint;
            BEGIN
                IF group_tenant IS NULL THEN RETURN; END IF;
                PERFORM pg_advisory_xact_lock(hashtextextended(group_tenant::text, 0));
                IF NOT EXISTS (SELECT 1 FROM dsg_bss_company WHERE tenant_id = group_tenant) THEN RETURN; END IF;
                IF (SELECT COUNT(*) FROM dsg_bss_saas_subscription_company sc
                    JOIN dsg_bss_company c ON c.company_id = sc.company_id
                    WHERE c.tenant_id = group_tenant AND sc.is_primary AND c.parent_company_id IS NULL) <> 1 THEN
                    RAISE EXCEPTION 'El grupo debe tener exactamente una empresa primaria';
                END IF;
                SELECT sc.company_id, sc.subscription_id INTO primary_id, subscription_key
                FROM dsg_bss_saas_subscription_company sc JOIN dsg_bss_company c ON c.company_id = sc.company_id
                WHERE c.tenant_id = group_tenant AND sc.is_primary;
                IF (SELECT COUNT(*) FROM dsg_bss_company WHERE tenant_id = group_tenant AND owner_user_id IS NOT NULL) <> 1
                   OR NOT EXISTS (SELECT 1 FROM dsg_bss_company WHERE tenant_id = group_tenant
                                  AND owner_user_id IS NOT NULL AND company_id = primary_id) THEN
                    RAISE EXCEPTION 'El grupo debe tener exactamente un dueño declarado en su empresa primaria';
                END IF;
                IF EXISTS (
                    SELECT 1 FROM dsg_bss_company c
                    LEFT JOIN dsg_bss_saas_subscription_company sc ON sc.company_id = c.company_id
                    WHERE c.tenant_id = group_tenant AND c.parent_company_id IS NULL
                      AND (sc.subscription_id IS NULL OR sc.subscription_id <> subscription_key)
                ) OR EXISTS (
                    SELECT 1 FROM dsg_bss_saas_subscription_company sc
                    JOIN dsg_bss_company c ON c.company_id = sc.company_id
                    WHERE sc.subscription_id = subscription_key
                      AND (c.tenant_id <> group_tenant OR c.parent_company_id IS NOT NULL)
                ) THEN RAISE EXCEPTION 'Las empresas del grupo deben compartir una sola suscripción y tenant'; END IF;
                IF EXISTS (
                    SELECT 1 FROM dsg_bss_company child JOIN dsg_bss_company parent ON parent.company_id = child.parent_company_id
                    WHERE (child.tenant_id = group_tenant OR parent.tenant_id = group_tenant)
                      AND (child.tenant_id <> parent.tenant_id OR parent.parent_company_id IS NOT NULL)
                ) THEN RAISE EXCEPTION 'La sucursal debe pertenecer a una empresa del mismo tenant'; END IF;
                IF EXISTS (
                    SELECT 1 FROM dsg_bss_user_company uc JOIN dsg_bss_company c ON c.company_id = uc.company_id
                    WHERE (uc.tenant_id = group_tenant OR c.tenant_id = group_tenant) AND uc.tenant_id <> c.tenant_id
                ) OR EXISTS (
                    SELECT 1 FROM dsg_bss_user_sucursal us JOIN dsg_bss_company c ON c.company_id = us.sucursal_id
                    WHERE (us.tenant_id = group_tenant OR c.tenant_id = group_tenant) AND us.tenant_id <> c.tenant_id
                ) THEN RAISE EXCEPTION 'La membresía y su entidad deben compartir tenant'; END IF;
            END $$;

            CREATE OR REPLACE FUNCTION check_company_group_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
            DECLARE group_tenant uuid;
            BEGIN
                IF TG_TABLE_NAME IN ('dsg_bss_company', 'dsg_bss_user_company', 'dsg_bss_user_sucursal') THEN
                    IF TG_OP <> 'INSERT' THEN PERFORM validate_company_group(OLD.tenant_id); END IF;
                    IF TG_OP <> 'DELETE' THEN PERFORM validate_company_group(NEW.tenant_id); END IF;
                ELSE
                    IF TG_OP <> 'INSERT' THEN
                        PERFORM validate_subscription_group(OLD.subscription_id);
                        IF TG_TABLE_NAME = 'dsg_bss_saas_subscription_company' THEN
                            SELECT tenant_id INTO group_tenant FROM dsg_bss_company WHERE company_id = OLD.company_id;
                            PERFORM validate_company_group(group_tenant);
                        END IF;
                    END IF;
                    IF TG_OP <> 'DELETE' THEN
                        PERFORM validate_subscription_group(NEW.subscription_id);
                        IF TG_TABLE_NAME = 'dsg_bss_saas_subscription_company' THEN
                            SELECT tenant_id INTO group_tenant FROM dsg_bss_company WHERE company_id = NEW.company_id;
                            PERFORM validate_company_group(group_tenant);
                        END IF;
                    END IF;
                END IF;
                RETURN NULL;
            END $$;
        `, { transaction });

        // Recién acá la función ya no referencia is_owner — se puede dropear.
        await sequelize.query('ALTER TABLE dsg_bss_user_company DROP CONSTRAINT IF EXISTS owner_membership_active', { transaction });
        await queryInterface.removeIndex('dsg_bss_user_company', 'unique_user_company_tenant_owner', { transaction });
        await queryInterface.removeColumn('dsg_bss_user_company', 'is_owner', { transaction });

        // Recrear los triggers diferidos con la lógica nueva — incluida la tabla nueva.
        for (const table of ['dsg_bss_company', 'dsg_bss_user_company', 'dsg_bss_user_sucursal', 'dsg_bss_saas_subscription_company', 'dsg_bss_saas_subscriptions']) {
            await sequelize.query(`CREATE CONSTRAINT TRIGGER check_company_group_integrity
                AFTER INSERT OR UPDATE OR DELETE ON ${table}
                DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_company_group_integrity()`, { transaction });
        }
    },

    async down(queryInterface, sequelize, transaction) {
        await queryInterface.addColumn('dsg_bss_user_company', 'is_owner', {
            type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false,
        }, { transaction });
        await queryInterface.addIndex('dsg_bss_user_company', ['tenant_id'], {
            transaction, unique: true, where: { is_owner: true }, name: 'unique_user_company_tenant_owner'
        });
        await sequelize.query('ALTER TABLE dsg_bss_user_company ADD CONSTRAINT owner_membership_active CHECK (NOT is_owner OR is_active)', { transaction });

        await sequelize.query(`CREATE OR REPLACE FUNCTION validate_company_group(group_tenant uuid) RETURNS void LANGUAGE plpgsql AS $$
            DECLARE primary_id bigint; subscription_key bigint;
            BEGIN
                IF group_tenant IS NULL THEN RETURN; END IF;
                PERFORM pg_advisory_xact_lock(hashtextextended(group_tenant::text, 0));
                IF NOT EXISTS (SELECT 1 FROM dsg_bss_company WHERE tenant_id = group_tenant) THEN RETURN; END IF;
                SELECT sc.company_id, sc.subscription_id INTO primary_id, subscription_key
                FROM dsg_bss_saas_subscription_company sc JOIN dsg_bss_company c ON c.company_id = sc.company_id
                WHERE c.tenant_id = group_tenant AND sc.is_primary;
                IF (SELECT COUNT(*) FROM dsg_bss_user_company WHERE tenant_id = group_tenant AND is_owner) <> 1
                   OR NOT EXISTS (SELECT 1 FROM dsg_bss_user_company WHERE tenant_id = group_tenant
                                  AND is_owner AND is_active AND company_id = primary_id) THEN
                    RAISE EXCEPTION 'El grupo debe tener exactamente un dueño asignado a su empresa primaria';
                END IF;
            END $$;

            CREATE OR REPLACE FUNCTION check_company_group_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
            DECLARE group_tenant uuid;
            BEGIN
                IF TG_TABLE_NAME IN ('dsg_bss_company', 'dsg_bss_user_company') THEN
                    IF TG_OP <> 'INSERT' THEN PERFORM validate_company_group(OLD.tenant_id); END IF;
                    IF TG_OP <> 'DELETE' THEN PERFORM validate_company_group(NEW.tenant_id); END IF;
                ELSE
                    IF TG_OP <> 'INSERT' THEN PERFORM validate_subscription_group(OLD.subscription_id); END IF;
                    IF TG_OP <> 'DELETE' THEN PERFORM validate_subscription_group(NEW.subscription_id); END IF;
                END IF;
                RETURN NULL;
            END $$;
        `, { transaction });

        await sequelize.query('DROP TRIGGER check_company_group_integrity ON dsg_bss_user_sucursal', { transaction });
        await queryInterface.dropTable('dsg_bss_user_sucursal', { transaction });
        await queryInterface.removeIndex('dsg_bss_company', 'unique_company_tenant_owner', { transaction });
        await queryInterface.removeColumn('dsg_bss_company', 'owner_user_id', { transaction });
    }
};

module.exports = migration;
