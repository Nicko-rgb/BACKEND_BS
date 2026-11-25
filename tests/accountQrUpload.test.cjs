// node --require tsx/cjs tests/accountQrUpload.test.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { Readable } = require('node:stream');
function stub(path, exports) { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports }; }
let previous = null;
stub('../src/config/db', {});
stub('../src/modules/system/repository/media.repository', {
    findPrimary: async () => previous,
    create: async (data) => data,
    remove: async () => {},
});
const { accountQrUpload, persistAccountQr } = require('../src/shared/middlewares/accountQrUpload');
const core = require('../src/modules/system/service/mediaCore.service');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aUuoAAAAASUVORK5CYII=', 'base64');
const image = { buffer: png, mimetype: 'image/png', originalname: '../../QR.html', fieldname: 'account_qr' };
const parseMultipart = async (mime, bytes) => {
    const boundary = 'account-test-boundary';
    const data = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="account_name"\r\n\r\nTitular\r\n--${boundary}\r\nContent-Disposition: form-data; name="account_qr"; filename="qr.png"\r\nContent-Type: ${mime}\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const req = Readable.from([data]);
    req.headers = { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': String(data.length) };
    await new Promise((resolve, reject) => accountQrUpload(req, {}, (err) => err ? reject(err) : resolve()));
    return req;
};
test('multipart conserva campos e imagen en memoria y limita formato/tamaño', async () => {
    const req = await parseMultipart('image/png', png);
    assert.equal(req.body.account_name, 'Titular'); assert.deepEqual(req.file.buffer, png); assert.equal(req.file.path, undefined);
    await assert.rejects(parseMultipart('image/svg+xml', Buffer.from('<svg/>')), { statusCode: 400 });
    await assert.rejects(parseMultipart('image/png', Buffer.alloc(5 * 1024 * 1024 + 1)), /5 MB/);
});
test('persiste en accounts con extensión propia y rechaza contenido simulado', async () => {
    const file = await persistAccountQr(image);
    try {
        assert.match(file.path, /uploads\/accounts\/qr-.*\.png$/);
        assert.deepEqual(fs.readFileSync(file.path), png);
        await assert.rejects(persistAccountQr({ ...image, buffer: Buffer.from('<html>') }), { statusCode: 400 });
    } finally { fs.unlinkSync(file.path); }
});
test('reemplazo conserva archivo previo hasta commit; rollback permite conservarlo', async () => {
    const oldFile = await persistAccountQr(image);
    const newFile = await persistAccountQr(image);
    previous = { file_url: `/uploads/accounts/${oldFile.filename}` };
    const callbacks = [];
    const transaction = { afterCommit: (callback) => callbacks.push(callback) };
    try {
        const record = await core.createRecord({ medible_id: 123, medible_type: 'PaymentAccount', tenant_id: null,
            category: 'QR', is_primary: true, replacePrevious: true, file: newFile, user_id: 1 }, transaction);
        assert.equal(record.file_url, `/uploads/accounts/${newFile.filename}`);
        assert.equal(callbacks.length, 1);
        assert.ok(fs.existsSync(oldFile.path), 'Un rollback debe dejar el archivo anterior disponible');
        callbacks.forEach((callback) => callback());
        assert.equal(fs.existsSync(oldFile.path), false);
        assert.ok(fs.existsSync(newFile.path));
    } finally {
        previous = null;
        if (fs.existsSync(oldFile.path)) fs.unlinkSync(oldFile.path);
        if (fs.existsSync(newFile.path)) fs.unlinkSync(newFile.path);
    }
});
