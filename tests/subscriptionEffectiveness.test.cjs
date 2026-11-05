const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Op } = require('sequelize');
const { SaaSSubscription, SaaSSubscriptionCompany } = require('../src/modules/saas/database/models');
const repository = require('../src/modules/saas/repository/saasSubscription.repository');
const { getActivePlanForCompany } = require('../src/modules/saas/service/planLimits.service');
const { toSubscriptionDto } = require('../src/modules/saas/dto/subscription.dto');

test('una cancelada vigente conserva el acceso y su estado en el DTO', async (t) => {
    const subscription = SaaSSubscription.build({
        plan_id: 1, status: 'CANCELED', is_effective: true,
        current_period_end: new Date('2099-01-01'),
    });
    subscription.plan = { name: 'Business', allows_multi_company: true };
    t.mock.method(SaaSSubscriptionCompany, 'findAll', async () => [
        { company_id: 10, subscription },
        { company_id: 11, subscription },
    ]);

    const primaryPlan = await getActivePlanForCompany(10);
    const sisterPlan = await getActivePlanForCompany(11);
    assert.equal(primaryPlan.isEffective, true);
    assert.deepEqual(primaryPlan, sisterPlan);
    const dto = toSubscriptionDto(subscription, null);
    assert.equal(dto.status, 'CANCELED');
    assert.equal(dto.isEffective, true);
    assert.equal('isValid' in dto, false);
    assert.equal(typeof subscription.isValid, 'undefined');
});

test('ACTIVE y TRIAL sin vigencia rechazan consumo aunque la fecha sea futura', async (t) => {
    for (const status of ['ACTIVE', 'TRIAL']) {
        t.mock.method(SaaSSubscriptionCompany, 'findAll', async () => [{
            company_id: 10,
            subscription: {
                status, is_effective: false, current_period_end: new Date('2099-01-01'),
                plan: { name: 'Start' },
            },
        }]);
        await assert.rejects(getActivePlanForCompany(10), /no está vigente/);
    }
});

test('la lectura usa la vigencia persistida sin recalcular fechas', async (t) => {
    t.mock.method(SaaSSubscriptionCompany, 'findAll', async () => [{
        company_id: 10,
        subscription: {
            status: 'ACTIVE', is_effective: true,
            current_period_end: new Date('2000-01-01'), plan: { name: 'Start' },
        },
    }]);
    assert.equal((await getActivePlanForCompany(10)).isEffective, true);
});

test('vencimiento actualiza estado y vigencia juntos sin excluir canceladas', async (t) => {
    const now = new Date('2026-11-03T12:00:00Z');
    const update = t.mock.method(SaaSSubscription, 'update', async () => [2]);
    assert.equal(await repository.expireEffectiveSubscriptions(now), 2);
    assert.equal(update.mock.callCount(), 1);
    const [values, options] = update.mock.calls[0].arguments;
    assert.deepEqual(values, { is_effective: false, status: 'PAST_DUE' });
    assert.deepEqual(options.where, {
        is_effective: true,
        current_period_end: { [Op.lte]: now },
    });
});

test('el job ejecuta el vencimiento al arrancar y registra la tarea periódica', async (t) => {
    const cron = require('node-cron').default;
    let runs = 0;
    const expire = t.mock.method(SaaSSubscription, 'update', async () => { runs++; return [0]; });
    let tick;
    const task = { stop() {} };
    t.mock.method(cron, 'schedule', (expression, callback) => {
        assert.equal(expression, '0 0 * * *');
        tick = callback;
        return task;
    });
    const { startSubscriptionExpiration } = require('../src/modules/saas/jobs/subscriptionExpiration.job');
    assert.equal(startSubscriptionExpiration(), task);
    assert.equal(runs, 1);
    tick(); // La primera ejecución sigue pendiente; no se solapa.
    assert.equal(expire.mock.callCount(), 1);
    await new Promise((resolve) => setImmediate(resolve));
    tick();
    assert.equal(runs, 2);
    await new Promise((resolve) => setImmediate(resolve));
});
