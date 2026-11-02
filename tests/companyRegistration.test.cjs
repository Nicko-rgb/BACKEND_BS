// node --require tsx/cjs --test tests/companyRegistration.test.cjs
// Servicios reales con persistencia simulada: no requiere BD ni envía notificaciones.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const stub = (path, exports) => { require.cache[require.resolve(path)] = { exports }; };
const transaction = { LOCK: { UPDATE: 'UPDATE' } };
let companies, plans, createdSubscriptions, links, users, assignments, notifications, primary, userCounts;
const root = (id, tenant = 'tenant-a') => ({ company_id: id, public_id: `company-${id}`, tenant_id: tenant, parent_company_id: null, is_enabled: 'A' });
const activePlan = (subscriptionId = 100) => ({
    subscriptionId, planId: 1, planName: 'Business', planPublicId: 'plan-business', status: 'ACTIVE',
    currentPeriodStart: null, currentPeriodEnd: null, allowsMultiCompany: true,
    maxUsers: 3, maxSubsidiaries: 2, maxSpaces: 3, maxInvoicesMonthly: 100,
    hasAdvancedReports: true, hasStripeConnect: true,
});
stub('../src/config/db.ts', { __esModule: true, default: { transaction: async (fn) => fn(transaction) } });
stub('../src/config/logger.ts', { __esModule: true, default: { error: () => {} } });
stub('bcryptjs', { hash: async () => 'hash' });
stub('../src/modules/companys/repository/company.repository.ts', {
    findRegistrationSources: async (ids) => companies.filter((c) => ids.includes(c.company_id)).map((c) => ({
        ...c, parentCompany: companies.find((p) => p.company_id === c.parent_company_id),
    })),
    findByDocument: async () => null,
    create: async (data) => { const row = { ...data, company_id: 90 }; companies.push(row); return row; },
    findByIdWithOwner: async (id) => companies.find((c) => c.company_id === id),
    findByPublicId: async (id) => companies.find((c) => c.public_id === id && c.parent_company_id === null),
    findSucursalIdsByParentIds: async (ids) => companies.filter((c) => ids.includes(c.parent_company_id)).map((c) => c.company_id),
    lockById: async (id) => companies.find((c) => c.company_id === id),
});
stub('../src/modules/saas/repository/saasPlan.repository.ts', {
    findByPublicId: async () => ({ plan_id: 1, name: 'Business', is_active: true, max_users: 3 }),
});
stub('../src/modules/saas/repository/saasSubscription.repository.ts', {
    findPlansByCompanyIds: async (ids) => Object.fromEntries(ids.filter((id) => plans[id]).map((id) => [id, plans[id]])),
    findPlanByCompanyId: async (id) => plans[id] ?? null,
    findPrimaryCompany: async () => primary,
    lockById: async (id) => ({ subscription_id: id }),
    create: async (data) => { createdSubscriptions.push(data); return { ...data, subscription_id: 200 }; },
    linkToCompany: async (subscriptionId, companyId, isPrimary) => {
        links.push({ subscriptionId, companyId, isPrimary });
        plans[companyId] = activePlan(subscriptionId);
    },
});
stub('../src/modules/users/repository/user.repository.ts', {
    findByEmail: async () => null,
    create: async (data) => { users.push(data); return { ...data, user_id: 9 }; },
    createPerson: async () => {},
});
stub('../src/modules/users/repository/userCompany.repository.ts', {
    create: async (data) => assignments.push(data),
    findOwnerByTenantId: async () => ({ user_id: 1, is_owner: true, user: { user_id: 1, first_name: 'Dueño', last_name: 'Grupo', email: 'group@example.com' } }),
    countActiveUsersByCompanyIds: async (ids) => new Set(ids.flatMap((id) => userCounts[id] ?? [])).size,
});
stub('../src/modules/users/repository/userPermission.repository.ts', { grantRoleDefaults: async () => {} });
stub('../src/modules/system/repository/country.repository.ts', { findById: async () => ({ is_active: true }) });
stub('../src/modules/system/repository/role.repository.ts', { findByKey: async () => ({ role_id: 2, is_active: true }) });
stub('../src/modules/companys/repository/space.repository.ts', { countBySucursalIds: async () => 0 });
stub('../src/modules/notificacions/service/notification.service.ts', { notify: async (...args) => notifications.push(args) });

const { register } = require('../src/modules/companys/service/company.service.ts');
const limits = require('../src/modules/saas/service/planLimits.service.ts');
const { isSubscriptionValid } = require('../src/modules/saas/utils/subscriptionValidity.ts');
const { registerCompanySchema } = require('../src/modules/companys/dto/company.schema.ts');
const actor = (ids = [11], scope = 3) => ({ user_id: 7, scope_level: scope, company_ids: ids, permissions: ['company.create'] });
const payload = () => ({
    company: { name: 'Nueva empresa', document: '20123456789', country_id: 1, ubigeo_id: 1, address: 'Calle 123', phone_cell: '999999999' },
});
const owner = { first_name: 'Nuevo', last_name: 'Dueño', email: 'owner@example.com', password: 'password123', phone: '999999999', country_id: 1, document_type: 'IDENTITY_CARD', document_number: '12345678' };
beforeEach(() => {
    primary = root(10);
    companies = [primary, { ...root(11), parent_company_id: 10 }, root(20), { ...root(21), parent_company_id: 20 }, root(30, 'tenant-b')];
    plans = { 10: activePlan(), 20: activePlan(), 30: activePlan(300) };
    createdSubscriptions = []; links = []; users = []; assignments = []; notifications = [];
    userCounts = { 10: [1], 11: [1, 2, 3], 20: [4], 21: [4, 5] };
});

test('system crea primaria, tenant nuevo y una suscripción, con vínculo primario', async () => {
    const data = { ...payload(), owner, plan: { plan_public_id: 'plan-business', billing_period: 'monthly' } };
    const result = await register(data, actor([], 1));
    assert.notEqual(result.company.tenant_id, 'tenant-a');
    assert.equal(createdSubscriptions.length, 1);
    assert.deepEqual(links, [{ subscriptionId: 200, companyId: 90, isPrimary: true }]);
    assert.equal(assignments[0].tenant_id, result.company.tenant_id);
    assert.equal(assignments[0].is_owner, true);
    assert.equal(assignments[0].role, undefined);
});

for (const [label, ids] of [['sucursal', [11]], ['primaria', [10]], ['hermana', [20]], ['varias empresas del mismo grupo', [10, 20]]]) {
    test(`usuario de ${label} crea hermana con tenant y suscripción heredados`, async () => {
        const result = await register(payload(), actor(ids));
        assert.equal(result.company.tenant_id, 'tenant-a');
        assert.equal(result.company.parent_company_id, null);
        assert.equal(createdSubscriptions.length, 0);
        assert.deepEqual(links, [{ subscriptionId: 100, companyId: 90, isPrimary: false }]);
        assert.equal(assignments.length, 0);
        assert.equal(users.length, 0);
        assert.equal(notifications[0][2].ownerId, 1);
        assert.equal(notifications[0][2].planName, 'Business');
    });
}

test('administrador no puede contratar otro plan ni crear un tenant, aunque envíe el payload anterior', async () => {
    await assert.rejects(register({ ...payload(), plan: { plan_public_id: 'plan-business', billing_period: 'monthly' } }, actor()), /hereda el plan/);
    assert.equal(users.length, 0);
    assert.equal(createdSubscriptions.length, 0);
});

test('sin asignaciones no puede crear empresa; system.full_access no amplía el alcance del rol', async () => {
    await assert.rejects(register(payload(), { ...actor([]), permissions: ['system.full_access'] }), /Debés pertenecer/);
    assert.equal(links.length, 0);
});

test('tener alcance sin company.create no autoriza el alta', async () => {
    await assert.rejects(register(payload(), { ...actor(), permissions: [] }), /permisos/);
    assert.equal(users.length, 0);
});

test('la selección permite su padre desde sucursal, pero rechaza otra empresa incluso del mismo tenant', async () => {
    await assert.rejects(register({ ...payload(), source_company_public_id: 'company-20' }, actor()), /Debés pertenecer/);
    await assert.rejects(register({ ...payload(), source_company_public_id: 'company-30' }, actor()), /Debés pertenecer/);
    await register({ ...payload(), source_company_public_id: 'company-10' }, actor());
    assert.equal(links.length, 1);
});

test('varios tenants requieren selección explícita; no elige el primer grupo', async () => {
    await assert.rejects(register(payload(), actor([10, 30])), /Seleccioná/);
    await register({ ...payload(), source_company_public_id: 'company-10' }, actor([10, 30]));
    assert.equal(links[0].subscriptionId, 100);
});

test('un plan sin multiempresa rechaza el alta antes de crear dueño o empresa', async () => {
    plans[10].allowsMultiCompany = false;
    await assert.rejects(register(payload(), actor()), /no permite crear empresas hermanas/);
    assert.equal(users.length, 0);
    assert.equal(companies.length, 5);
});

test('sin primaria o con una primaria de otro tenant no agrega empresas', async () => {
    primary = null;
    await assert.rejects(register(payload(), actor()), /primaria válida/);
    primary = root(30, 'tenant-b');
    await assert.rejects(register(payload(), actor()), /primaria válida/);
    assert.equal(links.length, 0);
});

test('system debe seleccionar plan; una primaria tampoco omite el cupo inicial del dueño', async () => {
    await assert.rejects(register({ ...payload(), owner }, actor([], 1)), /seleccionar un plan/);
    plans[10].maxUsers = 0;
    await assert.rejects(register(payload(), actor()), /al menos un usuario/);
});

for (const status of ['CANCELED', 'PAST_DUE', 'PENDING', 'INCOMPLETE']) {
    test(`suscripción ${status} bloquea creación de hermanas y recursos aunque haya cupo ilimitado`, async () => {
        plans[10].status = status;
        plans[10].maxUsers = 999;
        await assert.rejects(register(payload(), actor()), /no está vigente/);
        await assert.rejects(limits.assertPlanLimit(10, 'maxUsers', 0, transaction), /no está vigente/);
    });
}

test('suscripción vencida bloquea cupos y características; TRIAL vigente los permite', async () => {
    plans[10].currentPeriodEnd = new Date(Date.now() - 1000);
    await assert.rejects(limits.assertPlanFeature(10, 'hasAdvancedReports'), /no está vigente/);
    await assert.rejects(register(payload(), actor()), /no está vigente/);
    plans[10].status = 'TRIAL';
    plans[10].currentPeriodEnd = new Date(Date.now() + 60000);
    await limits.assertPlanLimit(10, 'maxUsers', 2, transaction);
});

test('el consumo es por empresa y sus sucursales: el cupo lleno de A no consume el de B', async () => {
    const a = await limits.getPlanUsage('company-10', actor([10, 20]));
    const b = await limits.getPlanUsage('company-20', actor([10, 20]));
    assert.equal(a.plan.subscriptionId, b.plan.subscriptionId);
    assert.equal(a.usage.users, 3);
    assert.equal(b.usage.users, 2);
    await assert.rejects(limits.assertPlanLimit(10, 'maxUsers', a.usage.users, transaction), /límite/);
    await limits.assertPlanLimit(20, 'maxUsers', b.usage.users, transaction);
    assert.equal(b.usage.subsidiaries, 1);
});

test('vigencia: extremos del período, fechas inválidas y alta manual sin fechas', () => {
    const now = Date.now();
    const base = { status: 'ACTIVE', current_period_start: null, current_period_end: null };
    assert.equal(isSubscriptionValid(base, now), true);
    assert.equal(isSubscriptionValid({ ...base, current_period_start: new Date(now + 1) }, now), false);
    assert.equal(isSubscriptionValid({ ...base, current_period_start: new Date(now) }, now), true);
    assert.equal(isSubscriptionValid({ ...base, current_period_end: new Date(now) }, now), false);
    assert.equal(isSubscriptionValid({ ...base, current_period_end: 'invalid' }, now), false);
});

test('el DTO permite heredar plan pero nunca acepta tenant_id ni is_primary del cliente', () => {
    assert.equal(registerCompanySchema.validate(payload()).error, undefined);
    assert.ok(registerCompanySchema.validate({ ...payload(), tenant_id: 'tenant-forged' }).error);
    assert.ok(registerCompanySchema.validate({ ...payload(), is_primary: true }).error);
});

test('una hermana no puede registrar un segundo dueño', async () => {
    await assert.rejects(register({ ...payload(), owner }, actor()), /hereda al dueño/);
    assert.equal(users.length, 0);
});
