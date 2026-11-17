// node --require tsx/cjs --test tests/paymentTypesByCountry.test.cjs
// Controlador, servicio y repositorio reales; BD y Redis sustituidos en este proceso.
const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
const { Op } = require('sequelize');

function stub(path, exports) {
    const id = require.resolve(path);
    require.cache[id] = { id, filename: id, loaded: true, exports };
}

const records = [
    { payment_type_id: 1, country_id: 1, name: 'Yape', is_enabled: true, country: { country: 'Perú' }, api_config: { secret: 'hidden' } },
    { payment_type_id: 2, country_id: null, code: 'CASH', name: 'Efectivo', is_enabled: true, country: null },
    { payment_type_id: 3, country_id: 1, name: 'Inactivo', is_enabled: false },
    { payment_type_id: 4, country_id: 2, name: 'Otro país', is_enabled: true },
    { payment_type_id: 5, country_id: null, code: 'DISABLED', name: 'Global inactivo', is_enabled: false },
];
const queries = [];
const cached = new Map();
const Country = {};

function matches(row, where) {
    return Reflect.ownKeys(where).every((key) => {
        if (key === Op.or) return where[key].some((condition) => matches(row, condition));
        const value = where[key];
        return row[key] === (value && typeof value === 'object' ? value[Op.is] : value);
    });
}

stub('../src/modules/system/database/models', {
    Country,
    PaymentType: {
        findAll: async (options) => {
            queries.push(options);
            return records.filter((row) => matches(row, options.where))
                .sort((a, b) => a.name.localeCompare(b.name));
        },
        findOne: async (options) => records.find((row) => matches(row, options.where)) ?? null,
        findByPk: async (id) => records.find((row) => row.payment_type_id === id) ?? null,
    },
});
stub('../src/shared/utils/checkReferences', {});
stub('../src/shared/utils/cacheUtility', {
    withCache: async (prefix, params, fetch) => {
        const key = `${prefix}:${JSON.stringify(params)}`;
        if (!cached.has(key)) cached.set(key, await fetch());
        return cached.get(key);
    },
});

const service = require('../src/modules/system/service/paymentType.service');
const controller = require('../src/modules/system/controllers/paymentType.controller');
const { createPaymentTypeSchema, updatePaymentTypeSchema } = require('../src/modules/system/dto/paymentType.dto');
stub('../src/modules/bookings/database/models', { PaymentBooking: {} });
stub('../src/modules/companys/database/models', { ConfigurationPayment: {} });
const payments = require('../src/modules/bookings/repository/paymentBooking.repository');

beforeEach(() => { queries.length = 0; cached.clear(); });

test('incluye globales y locales activos, sin incluir tipos de otros países', async () => {
    const rows = await service.listActiveByCountry(1);
    assert.deepEqual(rows.map((row) => row.payment_type_id), [2, 1]);
    assert.deepEqual(queries[0].where, {
        is_enabled: true, [Op.or]: [{ country_id: 1 }, { country_id: { [Op.is]: null } }],
    });
    assert.deepEqual(queries[0].order, [['name', 'ASC']]);
    assert.deepEqual(queries[0].include, [{ model: Country, as: 'country' }]);
    assert.equal(queries[0].limit, undefined);
});

test('la caché distingue países y usa el prefijo invalidado por las mutaciones', async () => {
    await service.listActiveByCountry(1);
    const country2 = await service.listActiveByCountry(2);
    await service.listActiveByCountry(1);
    assert.deepEqual(country2.map((row) => row.payment_type_id), [2, 4]);
    assert.equal(queries.length, 2);
    assert.equal(cached.size, 2);
    assert.ok([...cached.keys()].every((key) => key.startsWith('system:payment-types:')));
});

test('un país sin tipos locales recibe los globales activos', async () => {
    assert.deepEqual((await service.listActiveByCountry(999)).map((row) => row.payment_type_id), [2]);
});

test('rechaza identificadores inválidos con 400 antes de consultar BD o caché', async () => {
    for (const id of [NaN, Infinity, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        await assert.rejects(controller.listActiveByCountry({ params: { countryId: String(id) } }, {}), { statusCode: 400 });
    }
    assert.equal(queries.length, 0);
    assert.equal(cached.size, 0);
});

test('el controlador convierte el parámetro y responde con el DTO sin api_config', async () => {
    const res = {
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
    await controller.listActiveByCountry({ params: { countryId: '1' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data.map((row) => row.id), [2, 1]);
    assert.ok(res.body.data.every((row) => (row.countryId === 1 || row.countryId === null) && row.isActive));
    assert.equal(res.body.data[0].countryId, null);
    assert.equal(res.body.data[0].countryName, null);
    assert.equal(res.body.data[1].countryName, 'Perú');
    assert.equal('api_config' in res.body.data[1], false);
    assert.equal('pagination' in res.body, false);
});

test('los schemas aceptan GLOBAL explícito y rechazan país omitido, cero o inválido', () => {
    const base = { name: 'Efectivo', code: 'CASH', category: 'efectivo', is_enabled: true };
    for (const schema of [createPaymentTypeSchema, updatePaymentTypeSchema]) {
        assert.equal(schema.validate({ ...base, country_id: null }).error, undefined);
        assert.equal(schema.validate({ ...base, country_id: 1 }).error, undefined);
        for (const country_id of [undefined, 0, -1, 'GLOBAL']) {
            assert.ok(schema.validate({ ...base, country_id }).error);
        }
    }
});

test('crear o convertir a global un código ya global devuelve conflicto', async () => {
    await assert.rejects(service.create({ country_id: null, code: 'CASH' }), { statusCode: 409 });
    await assert.rejects(service.update(1, { country_id: null, code: 'CASH' }), { statusCode: 409 });
});

test('el registro de pagos admite globales activos y rechaza inactivos u otro país', async () => {
    assert.equal((await payments.findEnabledType(2, 2, {})).payment_type_id, 2);
    assert.equal((await payments.findEnabledType(1, 1, {})).payment_type_id, 1);
    assert.equal(await payments.findEnabledType(1, 2, {}), null);
    assert.equal(await payments.findEnabledType(5, 2, {}), null);
});
