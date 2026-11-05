const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Op } = require('sequelize');
const sequelize = require('../src/config/db').default;
const { Company, Space } = require('../src/modules/companys/database/models');
const { UserCompany } = require('../src/modules/users/database/models');
const { SaaSSubscriptionCompany } = require('../src/modules/saas/database/models');
const { findEffectiveCompanyIdsByUserId } = require('../src/modules/users/repository/userCompany.repository');
const { getCompanyContext } = require('../src/modules/companys/service/companyContext.service');
const { toCompanyContextDto } = require('../src/modules/companys/dto/companyContext.dto');
const sucursalService = require('../src/modules/companys/service/sucursal.service');
const spaceService = require('../src/modules/companys/service/space.service');
const userService = require('../src/modules/users/service/user.service');

const actor = { scope_level: 3, company_ids: [10, 11], permissions: [] };
const root = { company_id: 10, parent_company_id: null, public_id: 'empresa', name: 'Empresa', tenant_id: 't' };
const b1 = { company_id: 11, parent_company_id: 10, public_id: 'b1', name: 'B1' };
const b2 = { company_id: 12, parent_company_id: 10, public_id: 'b2', name: 'B2' };

test('la consulta de alcance expande hijas solo para asignaciones a empresas', async (t) => {
    const query = t.mock.method(sequelize, 'query', async () => [{ company_id: 10 }, { company_id: 11 }]);
    assert.deepEqual(await findEffectiveCompanyIdsByUserId(5, 3), [10, 11]);
    const [sql, options] = query.mock.calls[0].arguments;
    assert.match(sql, /a\.assigned_parent_id IS NULL AND c\.parent_company_id = a\.assigned_company_id/);
    assert.equal(options.replacements.ownerScope, false);
    await findEffectiveCompanyIdsByUserId(5, 2);
    assert.equal(query.mock.calls[1].arguments[1].replacements.ownerScope, true);
});

test('contexto marca B1 y su espacio accesibles y B2 y su espacio sin acceso', async (t) => {
    const find = t.mock.method(Company, 'findAll', async () => [root, b1, b2]);
    t.mock.method(Space, 'findAll', async () => [
        { sucursal_id: 11, public_id: 's1', name: 'Cancha 1' },
        { sucursal_id: 12, public_id: 's2', name: 'Cancha 2' },
    ]);
    t.mock.method(SaaSSubscriptionCompany, 'findAll', async () => []);
    const data = toCompanyContextDto(await getCompanyContext(actor));
    assert.equal(find.mock.calls[0].arguments[0].where[Op.or][1].parent_company_id[Op.in], actor.company_ids);
    assert.equal(data.companies[0].access, true);
    assert.deepEqual(data.companies[0].sucursales.map((b) => [b.publicId, b.access, b.spaces[0].access]), [
        ['b1', true, true], ['b2', false, false],
    ]);
});

test('B2 no permite consultar sucursal ni espacios con una asignación solo a B1', async (t) => {
    t.mock.method(Company, 'findOne', async () => b2);
    await assert.rejects(sucursalService.getByPublicId('b2', actor), /acceso/);
    await assert.rejects(spaceService.listBySucursal('b2', actor), /acceso/);
});

test('listados por empresa restringen sucursales y usuarios al alcance', async (t) => {
    t.mock.method(Company, 'findOne', async () => ({ ...root }));
    const branches = t.mock.method(Company, 'findAll', async () => [b1]);
    const assignments = t.mock.method(UserCompany, 'findAll', async () => []);
    t.mock.method(UserCompany, 'findOne', async () => null);
    await sucursalService.listByCompany('empresa', actor);
    assert.deepEqual(branches.mock.calls[0].arguments[0].where.company_id[Op.in], [10, 11]);
    await userService.listByCompany('empresa', actor);
    assert.deepEqual(branches.mock.calls[1].arguments[0].where.company_id[Op.in], [10, 11]);
    assert.deepEqual(assignments.mock.calls[0].arguments[0].where.company_id[Op.in], [10, 11]);
});
