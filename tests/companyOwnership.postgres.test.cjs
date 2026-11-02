// OWNER_DB_TEST=1 node --require tsx/cjs --test tests/companyOwnership.postgres.test.cjs
// Crea un esquema aislado dentro de una transacción y siempre hace ROLLBACK.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

test('baselines de propiedad y alcance contra PostgreSQL', { skip: process.env.OWNER_DB_TEST !== '1' }, async (t) => {
    const db = require('../src/config/db.ts').default;
    const membershipBaseline = require('../src/modules/users/database/migrations/025_baseline_user_company.ts');
    const bridgeBaseline = require('../src/modules/saas/database/migrations/043_baseline_saas_subscription_company.ts');
    const repository = require('../src/modules/users/repository/userCompany.repository.ts');
    const tx = await db.transaction();
    const query = (sql, replacements) => db.query(sql, { transaction: tx, replacements });
    const a = randomUUID(), b = randomUUID();
    const schema = `owner_test_${randomUUID().replaceAll('-', '')}`;
    try {
        await query(`CREATE SCHEMA "${schema}"; SET LOCAL search_path TO "${schema}";
            CREATE TABLE dsg_bss_user (user_id bigint PRIMARY KEY);
            CREATE TABLE dsg_bss_company (
                company_id bigint PRIMARY KEY, tenant_id uuid NOT NULL,
                parent_company_id bigint REFERENCES dsg_bss_company(company_id));
            CREATE TABLE dsg_bss_saas_subscriptions (subscription_id bigint PRIMARY KEY);`);
        await membershipBaseline.up(db.getQueryInterface(), db, tx);
        await bridgeBaseline.up(db.getQueryInterface(), db, tx);
        await query(`
            INSERT INTO dsg_bss_user VALUES (1), (2), (3), (4), (5);
            INSERT INTO dsg_bss_company VALUES
              (10, :a, NULL), (11, :a, 10), (12, :a, 10), (20, :a, NULL), (21, :a, 20),
              (30, :b, NULL), (31, :b, 30);
            INSERT INTO dsg_bss_saas_subscriptions VALUES (100), (300);
            INSERT INTO dsg_bss_saas_subscription_company (subscription_id, company_id, is_primary, created_at, updated_at)
              VALUES (100, 10, true, now(), now()), (100, 20, false, now(), now()), (300, 30, true, now(), now());
            INSERT INTO dsg_bss_user_company (user_id, company_id, tenant_id, is_owner, created_at, updated_at)
              VALUES (1, 10, :a, true, now(), now()), (2, 11, :a, false, now(), now()), (3, 20, :a, false, now(), now()),
                     (4, 30, :b, true, now(), now()), (5, 10, :a, false, now(), now());
            SET CONSTRAINTS ALL IMMEDIATE;
            SET CONSTRAINTS ALL DEFERRED;
        `, { a, b });

        const ids = async (userId) => (await repository.findEffectiveCompanyIdsByUserId(userId, tx)).sort((x, y) => x - y);
        await t.test('dueño obtiene primaria, hermanas y sucursales; otros no heredan grupo por tenant', async () => {
            assert.deepEqual(await ids(1), [10, 11, 12, 20, 21]);
            assert.deepEqual(await ids(2), [11]);
            assert.deepEqual(await ids(3), [20, 21]);
            assert.deepEqual(await ids(5), [10, 11, 12]);
            assert.deepEqual(await ids(4), [30, 31]);
        });
        await t.test('el dueño se cuenta en cada empresa sin duplicarlo por sucursal', async () => {
            assert.equal(await repository.countActiveUsersByCompanyIds([10, 11, 12], tx), 3);
            assert.equal(await repository.countActiveUsersByCompanyIds([20, 21], tx), 2);
            await query('INSERT INTO dsg_bss_user_company (user_id, company_id, tenant_id, created_at, updated_at) VALUES (1, 21, :a, now(), now())', { a });
            assert.equal(await repository.countActiveUsersByCompanyIds([20, 21], tx), 2);
        });

        const rejectsChange = async (sql, pattern) => {
            await query('SAVEPOINT rejected_change');
            try {
                await assert.rejects(async () => {
                    await query(sql, { a, b });
                    await query('SET CONSTRAINTS ALL IMMEDIATE');
                }, (error) => pattern.test(`${error.message} ${error.parent?.constraint ?? ''} ${error.parent?.message ?? ''}`));
            } finally {
                await query('ROLLBACK TO SAVEPOINT rejected_change; RELEASE SAVEPOINT rejected_change');
            }
        };
        await t.test('no admite dos dueños, dueño en hermana, grupo sin dueño ni membresía de otro tenant', async () => {
            await rejectsChange('UPDATE dsg_bss_user_company SET is_owner = true WHERE user_id = 3', /unique_user_company_tenant_owner/);
            await rejectsChange('UPDATE dsg_bss_user_company SET company_id = 20 WHERE is_owner AND tenant_id = :a', /dueño asignado/);
            await rejectsChange('DELETE FROM dsg_bss_user_company WHERE is_owner AND tenant_id = :a', /exactamente un dueño/);
            await rejectsChange('UPDATE dsg_bss_user_company SET tenant_id = :b WHERE user_id = 2', /compartir tenant/);
        });
        await t.test('no admite doble primaria, hermana con suscripción ajena ni sucursal en otro tenant', async () => {
            await rejectsChange('UPDATE dsg_bss_saas_subscription_company SET is_primary = true WHERE company_id = 20', /unique_saas_subscription_company_primary/);
            await rejectsChange('UPDATE dsg_bss_saas_subscription_company SET subscription_id = 300 WHERE company_id = 20', /suscripción y tenant/);
            await rejectsChange('UPDATE dsg_bss_company SET parent_company_id = 30 WHERE company_id = 11', /mismo tenant/);
            await rejectsChange('INSERT INTO dsg_bss_saas_subscriptions VALUES (400)', /empresa primaria/);
        });
        await t.test('una hermana nueva entra al alcance del dueño sin crear otro usuario o membresía', async () => {
            await query(`INSERT INTO dsg_bss_company VALUES (40, :a, NULL), (41, :a, 40);
                INSERT INTO dsg_bss_saas_subscription_company (subscription_id, company_id, created_at, updated_at) VALUES (100, 40, now(), now());
                SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED`, { a });
            assert.deepEqual(await ids(1), [10, 11, 12, 20, 21, 40, 41]);
            assert.deepEqual(await ids(3), [20, 21]);
            assert.equal(await repository.countActiveUsersByCompanyIds([40, 41], tx), 1);
        });
        await t.test('desactivar membresía revoca alcance; el baseline no tiene columna role', async () => {
            await query('UPDATE dsg_bss_user_company SET is_active = false WHERE user_id = 2');
            assert.deepEqual(await ids(2), []);
            const [columns] = await query(`SELECT column_name FROM information_schema.columns
                WHERE table_schema = :schema AND table_name = 'dsg_bss_user_company'`, { schema });
            assert.equal(columns.some((c) => c.column_name === 'role'), false);
            assert.equal(columns.some((c) => c.column_name === 'is_owner'), true);
        });
    } finally {
        await tx.rollback();
        await db.close();
    }
});
