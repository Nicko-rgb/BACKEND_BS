// node --require tsx/cjs --test tests/paymentConfig.test.cjs
// Servicio, scope, repositorio y controlador reales; solo DB y crypto sustituidos.
const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
function stub(path, exports) { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports }; }
const user = { user_id: 10, scope_level: 3, company_ids: [1, 2, 3] };
const branches = {
    peru: { company_id: 1, country_id: 1, tenant_id: 'tenant-a', country: { iso_country: 'PE' } },
    other: { company_id: 2, country_id: 2, tenant_id: 'tenant-b', country: { iso_country: 'CO' } },
    second: { company_id: 3, country_id: 1, tenant_id: 'tenant-a', country: { iso_country: 'PE' } },
    forbidden: { company_id: 4, country_id: 1 },
    noCountry: { company_id: 1, country_id: null, country: null },
};
const types = [
    { payment_type_id: 1, country_id: 1, code: 'PLIN', category: 'billetera_digital', is_enabled: true },
    { payment_type_id: 2, country_id: null, code: 'BANK', category: 'transferencia_bancaria', is_enabled: true },
    { payment_type_id: 3, country_id: null, code: 'CASH', category: 'efectivo', is_enabled: true },
    { payment_type_id: 4, country_id: 1, code: 'YAPE', provider: 'Mercado Pago', is_enabled: true },
    { payment_type_id: 5, country_id: 1, code: 'DISABLED', is_enabled: false },
];
let rows = [], nextId = 1, locks = [], credentialReads = [], removedFiles = [], removedMedia = [], failMedia = false;
const transaction = { LOCK: { UPDATE: 'UPDATE' } };
const matches = (row, where) => Object.entries(where).every(([key, value]) => row[key] === value);
const makeAccount = (data) => ({ ...data, payment_account_id: nextId++,
    async update(fields) { Object.assign(this, fields); return this; },
    async destroy() { rows = rows.filter((row) => row !== this); },
});
stub('../src/config/db', { transaction: async (callback) => callback(transaction) });
stub('../src/shared/middlewares/accountQrUpload', { persistAccountQr: async (file) => ({ ...file, fieldname: 'account_qr', filename: 'test.png' }) });
stub('../src/modules/system/service/mediaCore.service', {
    createRecord: async (input) => {
        if (failMedia) throw new Error('media failed');
        assert.equal(input.medible_type, 'PaymentAccount');
        assert.equal(input.category, 'QR');
        assert.equal(input.replacePrevious, true);
        return { file_url: '/uploads/accounts/test.png', medible_id: input.medible_id };
    },
    removeRecord: async (media) => { removedMedia.push(media); },
    removePhysicalFile: (url) => { removedFiles.push(url); },
});
stub('../src/shared/utils/encryption', { encrypt: () => 'encrypted' });
stub('../src/modules/companys/repository/company.repository', { findSucursalByPublicId: async (id) => branches[id] ?? null });
stub('../src/modules/companys/repository/space.repository', {});
stub('../src/modules/system/database/models', { PaymentType: { findByPk: async (id) => types.find((type) => type.payment_type_id === id) ?? null } });
stub('../src/modules/companys/database/models', {
    Company: { findByPk: async (id, options) => { assert.equal(options.transaction, transaction); assert.equal(options.lock, 'UPDATE'); locks.push(id); } },
    PaymentAccount: {
        findAll: async ({ where }) => rows.filter((row) => matches(row, where)),
        findOne: async ({ where }) => rows.find((row) => matches(row, where)) ?? null,
        create: async (data) => { const row = makeAccount(data); rows.push(row); return row; },
    },
    MercadoPagoCredential: { findOne: async ({ where }) => { credentialReads.push(where.sucursal_id); return null; } },
});
const service = require('../src/modules/companys/service/paymentConfig.service');
const controller = require('../src/modules/companys/controllers/paymentConfig.controller');
const { manualPaymentAccountSchema } = require('../src/modules/companys/dto/paymentConfig.schema');
const payload = { account_name: 'Titular de prueba', account_number: '999888777', account_alias: '', bank_name: '' };
beforeEach(() => { rows = []; nextId = 1; locks = []; credentialReads = []; removedFiles = []; removedMedia = []; failMedia = false; });

test('alta, lectura y edición sin duplicar; tenant y auditoría del servidor', async () => {
    const first = await service.saveManualAccount('peru', 1, { ...payload, tenant_id: 'injected', sucursal_id: 99 }, user);
    assert.equal(first.tenant_id, 'tenant-a'); assert.equal(first.sucursal_id, 1); assert.equal(first.user_create, 10);
    assert.equal(first.account_alias, null); assert.equal(await service.getManualAccount('peru', 1, user), first);
    const updated = await service.saveManualAccount('peru', 1, { ...payload, account_number: '988777666' }, user);
    assert.equal(updated.payment_account_id, first.payment_account_id); assert.equal(updated.account_number, '988777666');
    assert.equal(updated.user_update, 10); assert.equal(rows.length, 1); assert.deepEqual(locks, [1, 1]);
});
test('aísla sucursales y elimina solo la cuenta seleccionada', async () => {
    await service.saveManualAccount('peru', 1, payload, user); await service.saveManualAccount('second', 1, payload, user);
    assert.equal((await service.listManualAccounts('peru', user)).length, 1);
    await service.deleteManualAccount('peru', 1, user);
    assert.equal(await service.getManualAccount('peru', 1, user), null); assert.ok(await service.getManualAccount('second', 1, user));
    await assert.rejects(service.deleteManualAccount('peru', 1, user), { statusCode: 404 });
});
test('rechaza país distinto o ausente y acepta tipos globales', async () => {
    await assert.rejects(service.saveManualAccount('other', 1, payload, user), { statusCode: 400 });
    await assert.rejects(service.saveManualAccount('noCountry', 2, payload, user), { statusCode: 400 });
    assert.equal((await service.saveManualAccount('other', 2, payload, user)).sucursal_id, 2);
});
test('rechaza efectivo, MP, tipos inactivos y celular Plin inválido', async () => {
    for (const id of [3, 4, 5]) await assert.rejects(service.saveManualAccount('peru', id, payload, user), { statusCode: 400 });
    await assert.rejects(service.saveManualAccount('peru', 1, { ...payload, account_number: '123' }, user), { statusCode: 400 });
    assert.equal(rows.length, 0);
});
test('todas las operaciones comprueban alcance y sucursal existente', async () => {
    for (const operation of [() => service.listManualAccounts('forbidden', user), () => service.getManualAccount('forbidden', 1, user),
        () => service.saveManualAccount('forbidden', 1, payload, user), () => service.deleteManualAccount('forbidden', 1, user)]) {
        await assert.rejects(operation(), { statusCode: 403 });
    }
    await assert.rejects(service.saveManualAccount('parent', 1, payload, user), { statusCode: 404 }); assert.equal(rows.length, 0);
});
test('valida IDs y tipo inexistente', async () => {
    for (const id of [NaN, Infinity, -1, 0, 1.5]) await assert.rejects(service.getManualAccount('peru', id, user), { statusCode: 400 });
    await assert.rejects(service.getManualAccount('peru', 999, user), { statusCode: 404 });
});
test('MP valida Perú en las tres operaciones y consulta por sucursal_id', async () => {
    await assert.rejects(service.getMercadoPagoStatus('other', user), { statusCode: 400 });
    await assert.rejects(service.registerMercadoPagoCredential('other', { access_token: 'token' }, user), { statusCode: 400 });
    await assert.rejects(service.disconnectMercadoPagoCredential('other', user), { statusCode: 400 }); assert.deepEqual(credentialReads, []);
    await service.getMercadoPagoStatus('peru', user); await service.getMercadoPagoStatus('second', user); assert.deepEqual(credentialReads, [1, 3]);
});
test('DTO sin tenant ni auditoría', async () => {
    const res = { status() { return this; }, json(body) { this.body = body; return this; } };
    await controller.saveManualAccount({ params: { sucursalPublicId: 'peru', paymentTypeId: '1' }, validatedData: payload, user }, res);
    assert.deepEqual(Object.keys(res.body.data).sort(), ['paymentTypeId', 'account_name', 'account_number', 'account_alias', 'qr_url', 'qr', 'bank_name', 'isActive'].sort());
});
test('schema recorta y rechaza vacíos, longitudes y URL insegura', () => {
    assert.equal(manualPaymentAccountSchema.validate({ ...payload, account_name: ' Ana ' }).value.account_name, 'Ana');
    for (const invalid of [{ account_name: ' ' }, { account_number: '' }, { account_alias: 'a'.repeat(151) }, { qr_url: 'javascript:alert(1)' }]) {
        assert.ok(manualPaymentAccountSchema.validate({ ...payload, ...invalid }).error);
    }
});


test('sube QR asociado a la cuenta y conserva la referencia al editar solo texto', async () => {
    const account = await service.saveManualAccount('peru', 1, payload, user, { mimetype: 'image/png' });
    assert.equal(account.qr_url, '/uploads/accounts/test.png');
    assert.equal(account.qr.medible_id, account.payment_account_id);
    const edited = await service.saveManualAccount('peru', 1, { ...payload, account_name: 'Otro titular' }, user);
    assert.equal(edited.qr_url, account.qr_url);
    assert.equal(removedMedia.length, 0);
});
test('quitar QR limpia Media y qr_url; eliminar cuenta también elimina su QR', async () => {
    await service.saveManualAccount('peru', 1, payload, user, {});
    const cleared = await service.saveManualAccount('peru', 1, { ...payload, remove_qr: true }, user);
    assert.equal(cleared.qr, null); assert.equal(cleared.qr_url, null); assert.equal(removedMedia.length, 1);
    await service.saveManualAccount('peru', 1, payload, user, {});
    await service.deleteManualAccount('peru', 1, user);
    assert.equal(removedMedia.length, 2);
});
test('un fallo guardando Media limpia el archivo nuevo', async () => {
    failMedia = true;
    await assert.rejects(service.saveManualAccount('peru', 1, payload, user, {}), /media failed/);
    assert.deepEqual(removedFiles, ['/uploads/accounts/test.png']);
});
test('no permite subir y quitar QR a la vez; qr_url no se acepta desde el cliente', async () => {
    await assert.rejects(service.saveManualAccount('peru', 1, { ...payload, remove_qr: true }, user, {}), { statusCode: 400 });
    assert.ok(manualPaymentAccountSchema.validate({ ...payload, qr_url: '/uploads/accounts/foreign.png' }).error);
    assert.equal(manualPaymentAccountSchema.validate({ ...payload, remove_qr: 'true' }).value.remove_qr, true);
});
