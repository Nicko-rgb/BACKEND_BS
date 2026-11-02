/**
 * Baseline: crear tabla dsg_bss_saas_subscription_company
 * Tabla puente muchos-a-muchos entre SaaSSubscription y Company — sostiene "Multi Empresa"
 * (plan Business): una sola suscripción puede cubrir más de una empresa raíz.
 */
import { DataTypes } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: 'Baseline: create dsg_bss_saas_subscription_company',
        module: 'saas',
        order: 43
    },

    async up(queryInterface, sequelize, transaction) {
        await queryInterface.createTable('dsg_bss_saas_subscription_company', {
            subscription_company_id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            subscription_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                comment: 'Suscripción que cubre a esta empresa',
                references: { model: 'dsg_bss_saas_subscriptions', key: 'subscription_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            company_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                comment: 'Empresa raíz cubierta (parent_company_id IS NULL — se valida en el Service)',
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            is_primary: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Empresa titular de la suscripción — a ella apunta SaaSInvoice.company_id al facturar'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        }, { transaction });

        await queryInterface.addIndex('dsg_bss_saas_subscription_company', {
            fields: ['subscription_id', 'company_id'],
            unique: true,
            name: 'unique_saas_subscription_company',
            transaction,
        });
        await queryInterface.addIndex('dsg_bss_saas_subscription_company', {
            fields: ['company_id'],
            name: 'unique_subscription_company_membership',
            unique: true,
            transaction,
        });
        // Como máximo una empresa primaria por suscripción — lo garantiza la DB (índice único parcial), no el Service.
        await queryInterface.addIndex('dsg_bss_saas_subscription_company', {
            fields: ['subscription_id'],
            unique: true,
            name: 'unique_saas_subscription_company_primary',
            where: { is_primary: true },
            transaction,
        });

        // Validación diferida: primaria, dueño y suscripción se crean en la misma transacción.
        await sequelize.query(`
            CREATE FUNCTION validate_company_group(group_tenant uuid) RETURNS void LANGUAGE plpgsql AS $$
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
                IF (SELECT COUNT(*) FROM dsg_bss_user_company WHERE tenant_id = group_tenant AND is_owner) <> 1
                   OR NOT EXISTS (SELECT 1 FROM dsg_bss_user_company WHERE tenant_id = group_tenant
                                  AND is_owner AND is_active AND company_id = primary_id) THEN
                    RAISE EXCEPTION 'El grupo debe tener exactamente un dueño asignado a su empresa primaria';
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
                ) THEN RAISE EXCEPTION 'La membresía y su empresa deben compartir tenant'; END IF;
            END $$;

            CREATE FUNCTION validate_subscription_group(subscription_key bigint) RETURNS void LANGUAGE plpgsql AS $$
            DECLARE group_tenant uuid;
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM dsg_bss_saas_subscriptions WHERE subscription_id = subscription_key) THEN RETURN; END IF;
                SELECT c.tenant_id INTO group_tenant FROM dsg_bss_saas_subscription_company sc
                JOIN dsg_bss_company c ON c.company_id = sc.company_id
                WHERE sc.subscription_id = subscription_key AND sc.is_primary;
                IF group_tenant IS NULL THEN RAISE EXCEPTION 'La suscripción debe tener una empresa primaria'; END IF;
                PERFORM validate_company_group(group_tenant);
            END $$;

            CREATE FUNCTION check_company_group_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
            DECLARE group_tenant uuid;
            BEGIN
                IF TG_TABLE_NAME IN ('dsg_bss_company', 'dsg_bss_user_company') THEN
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
        for (const table of ['dsg_bss_company', 'dsg_bss_user_company', 'dsg_bss_saas_subscription_company', 'dsg_bss_saas_subscriptions']) {
            await sequelize.query(`CREATE CONSTRAINT TRIGGER check_company_group_integrity
                AFTER INSERT OR UPDATE OR DELETE ON ${table}
                DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_company_group_integrity()`, { transaction });
        }
    },

    async down(queryInterface, sequelize, transaction) {
        for (const table of ['dsg_bss_company', 'dsg_bss_user_company', 'dsg_bss_saas_subscription_company', 'dsg_bss_saas_subscriptions']) {
            await sequelize.query(`DROP TRIGGER check_company_group_integrity ON ${table}`, { transaction });
        }
        await sequelize.query(`DROP FUNCTION check_company_group_integrity();
            DROP FUNCTION validate_subscription_group(bigint);
            DROP FUNCTION validate_company_group(uuid);`, { transaction });
        await queryInterface.dropTable('dsg_bss_saas_subscription_company', { transaction });
    }
};

module.exports = migration;
