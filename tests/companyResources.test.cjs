const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Company } = require('../src/modules/companys/database/models');
const { UserCompany } = require('../src/modules/users/database/models');
const sucursalService = require('../src/modules/companys/service/sucursal.service');
const userService = require('../src/modules/users/service/user.service');
const companyService = require('../src/modules/companys/service/company.service');
const { toCompanyDetailDto } = require('../src/modules/companys/dto/company.dto');
const { toCompanyBranchesDto } = require('../src/modules/companys/dto/sucursal.dto');
const { toCompanyAssignmentsDto } = require('../src/modules/users/dto/companyUsers.dto');

const root = { company_id: 10, public_id: 'root', name: 'Empresa', tenant_id: 'tenant' };
const branch = { company_id: 11, public_id: 'branch', name: 'Sucursal', address: 'Calle 1', status: 'ACTIVE' };

test('detalle de empresa solo consulta y devuelve sus propios datos', async (t) => {
    const find = t.mock.method(Company, 'findOne', async () => ({ ...root, subsidiaries: [branch] }));
    const users = t.mock.method(UserCompany, 'findAll', async () => { throw new Error('no debe cargar usuarios'); });
    const company = await companyService.getByPublicId('root', { scope_level: 1, company_ids: [] });
    const includes = find.mock.calls[0].arguments[0].include.map((item) => item.association);
    assert.deepEqual(includes, ['country', 'ubigeo']);
    assert.equal(users.mock.callCount(), 0);
    const dto = toCompanyDetailDto(company);
    assert.equal(dto.publicId, 'root');
    assert.equal('subsidiaries' in dto, false);
    assert.equal('users' in dto, false);
    assert.equal('tenant_id' in dto, false);
});

test('sucursales consulta solo la empresa autorizada y no carga usuarios', async (t) => {
    t.mock.method(Company, 'findOne', async () => ({ ...root }));
    const findBranches = t.mock.method(Company, 'findAll', async () => [branch]);
    const findUsers = t.mock.method(UserCompany, 'findAll', async () => { throw new Error('no debe cargar usuarios'); });
    const result = await sucursalService.listByCompany('root', { scope_level: 1, company_ids: [] });
    assert.equal(findBranches.mock.calls[0].arguments[0].where.parent_company_id, 10);
    assert.equal(findUsers.mock.callCount(), 0);
    assert.deepEqual(toCompanyBranchesDto(result), [{ publicId: 'branch', name: 'Sucursal', address: 'Calle 1', ubigeo: null, status: 'ACTIVE' }]);
});

test('ambos recursos rechazan empresas fuera del alcance antes de leer datos asociados', async (t) => {
    t.mock.method(Company, 'findOne', async () => ({ ...root }));
    const branches = t.mock.method(Company, 'findAll', async () => []);
    for (const operation of [sucursalService.listByCompany, userService.listByCompany]) {
        await assert.rejects(operation('root', { scope_level: 3, company_ids: [99] }), /acceso/);
    }
    assert.equal(branches.mock.callCount(), 0);
});

test('usuarios agrupa asignaciones e incluye al dueño heredado sin exponer identificadores internos', async (t) => {
    t.mock.method(Company, 'findOne', async () => ({ ...root }));
    t.mock.method(Company, 'findAll', async () => [branch]);
    t.mock.method(UserCompany, 'findAll', async () => [{ user_id: 2, company_id: 11, user: { user_id: 2, public_id: 'employee', roleRef: { key: 'empleado' } } }]);
    t.mock.method(UserCompany, 'findOne', async () => ({ user_id: 1, is_owner: true, user: { user_id: 1, public_id: 'owner', roleRef: { key: 'super_admin' } } }));
    const { company, assignments } = await userService.listByCompany('root', { scope_level: 2, company_ids: [10, 11] });
    const result = toCompanyAssignmentsDto(company, assignments);
    assert.deepEqual(result.map((user) => user.publicId), ['employee', 'owner']);
    assert.deepEqual(result[0].sucursales, [{ publicId: 'branch', name: 'Sucursal' }]);
    assert.deepEqual(result[1].sucursales, [{ publicId: 'root', name: 'Empresa' }]);
    assert.equal('user_id' in result[0], false);
});
