// PAYMENT_ACCOUNT_DB_TEST=1 node --require tsx/cjs tests/paymentAccount.integration.cjs
// Usa PostgreSQL configurado; todos los datos de prueba se revierten al terminar.
const assert = require('node:assert/strict');
const { test } = require('node:test');

test('PostgreSQL: CRUD y unicidad por sucursal/tipo con rollback', { skip: process.env.PAYMENT_ACCOUNT_DB_TEST !== '1' }, async () => {
    const { randomUUID } = require('node:crypto');
    const { Op } = require('sequelize');
    const sequelize = require('../src/config/db').default;
    const { Company, PaymentAccount } = require('../src/modules/companys/database/models');
    const { PaymentType } = require('../src/modules/system/database/models');
    const repository = require('../src/modules/companys/repository/paymentAccount.repository');
    const { persistAccountQr } = require('../src/shared/middlewares/accountQrUpload');
    const core = require('../src/modules/system/service/mediaCore.service');
    let qrFile;
    const transaction = await sequelize.transaction();
    try {
        const branches = await Company.findAll({ where: { parent_company_id: { [Op.ne]: null } }, limit: 2, transaction });
        assert.equal(branches.length, 2, 'Se requieren dos sucursales locales para esta prueba');
        const type = await PaymentType.create({ country_id: null, name: 'Prueba temporal', code: `TEST_${randomUUID()}`,
            category: 'transferencia_bancaria', is_enabled: true }, { transaction });
        const fields = { sucursal_id: branches[0].company_id, payment_type_id: type.payment_type_id,
            tenant_id: branches[0].tenant_id, user_create: branches[0].user_create, user_update: null,
            account_name: 'Cuenta de prueba', account_number: '999888777', account_alias: null, qr_url: null, bank_name: null };
        await repository.lockSucursal(branches[0].company_id, transaction);
        const account = await repository.create(fields, transaction);
        qrFile = await persistAccountQr({ buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aUuoAAAAASUVORK5CYII=', 'base64'),
            mimetype: 'image/png', originalname: 'qr-test.png', fieldname: 'account_qr' });
        const qr = await core.createRecord({ medible_id: account.payment_account_id, medible_type: 'PaymentAccount',
            category: 'QR', type: 'IMAGE', is_primary: true, replacePrevious: true, file: qrFile,
            user_id: fields.user_create, tenant_id: fields.tenant_id }, transaction);
        await repository.update(account, { qr_url: qr.file_url }, transaction);
        const loaded = await repository.findBySucursalAndType(branches[0].company_id, type.payment_type_id, transaction);
        assert.equal(loaded.qr.public_id, qr.public_id);
        assert.equal(loaded.qr_url, qr.file_url);

        assert.equal((await repository.findBySucursalAndType(branches[0].company_id, type.payment_type_id, transaction)).account_number, '999888777');
        await repository.update(account, { account_name: 'Titular editado' }, transaction);
        assert.equal((await repository.findBySucursalAndType(branches[0].company_id, type.payment_type_id, transaction)).account_name, 'Titular editado');
        // Savepoint: el rechazo SQL no aborta la transacción principal.
        await assert.rejects(sequelize.transaction({ transaction }, (savepoint) => repository.create(fields, savepoint)),
            { name: 'SequelizeUniqueConstraintError' });
        const second = await repository.create({ ...fields, sucursal_id: branches[1].company_id, tenant_id: branches[1].tenant_id }, transaction);
        await core.removeRecord(qr, transaction);
        await repository.remove(account, transaction);
        assert.equal(await repository.findBySucursalAndType(branches[0].company_id, type.payment_type_id, transaction), null);
        assert.equal((await repository.findBySucursalAndType(branches[1].company_id, type.payment_type_id, transaction)).payment_account_id, second.payment_account_id);
        assert.equal(await PaymentAccount.count({ where: { payment_type_id: type.payment_type_id }, transaction }), 1);
    } finally {
        await transaction.rollback();
        if (qrFile) core.removePhysicalFile(`/uploads/accounts/${qrFile.filename}`);
        await sequelize.close();
    }
});
