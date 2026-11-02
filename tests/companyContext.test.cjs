// node --require tsx/cjs --test tests/companyContext.test.cjs
// Ejecuta repository → service → DTO con modelos simulados, sin conexión a BD.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');

const peru = { country_id: 1, country: 'Perú', iso_country: 'PE', iso_currency: 'PEN', currency: 'Sol', currency_simbol: 'S/' };
const colombia = { country_id: 2, country: 'Colombia', iso_country: 'CO', iso_currency: 'COP', currency: 'Peso', currency_simbol: '$' };
const company = (id, name, parent = null, country = peru) => ({
    company_id: id, parent_company_id: parent, public_id: `company-${id}`, name, country,
    tenant_id: 'private-tenant', document: 'private-document',
});
const alpha = company(10, 'Alpha');
const zeta = company(20, 'Zeta');
const companies = [
    alpha, zeta, company(30, 'Empty'),
    { ...company(11, 'Lima', 10), parentCompany: alpha },
    { ...company(12, 'Bogotá', 10, colombia), parentCompany: alpha },
    { ...company(21, 'Sur', 20), parentCompany: zeta },
];
const spaces = [
    { sucursal_id: 11, public_id: 'space-1', name: 'Cancha B', space_id: 1, tenant_id: 'secret' },
    { sucursal_id: 11, public_id: 'space-2', name: 'Cancha A', space_id: 2 },
    { sucursal_id: 12, public_id: 'space-3', name: 'Cancha Colombia', space_id: 3 },
    { sucursal_id: 21, public_id: 'space-4', name: 'Cancha Sur', space_id: 4 },
];
let queries;
const sort = (rows) => [...rows].sort((a, b) => a.name.localeCompare(b.name, 'es') || a.public_id.localeCompare(b.public_id));

// Sustituir solo la frontera de persistencia. Las reglas de alcance son las reales.
require.cache[require.resolve('../src/modules/companys/database/models/index.ts')] = {
    exports: {
        Company: { findAll: async (query) => {
            queries.push({ type: 'companies', query });
            const ids = query.where.company_id?.[Op.in];
            return sort(ids === undefined ? companies : companies.filter((row) => ids.includes(row.company_id)));
        } },
        Space: { findAll: async (query) => {
            queries.push({ type: 'spaces', query });
            return sort(spaces.filter((row) => query.where.sucursal_id[Op.in].includes(row.sucursal_id)));
        } },
    },
};

require.cache[require.resolve('../src/modules/saas/repository/saasSubscription.repository.ts')] = { exports: {
    findCompanyMemberships: async (ids) => ids.map((company_id) => ({ company_id, is_primary: company_id === 10 })),
} };

const { getCompanyContext } = require('../src/modules/companys/service/companyContext.service.ts');
const { toCompanyContextDto } = require('../src/modules/companys/dto/companyContext.dto.ts');
const { toLoginAdminDto } = require('../src/modules/auth/dto/loginAdmin.dto.ts');
const { assertCompanyScope } = require('../src/shared/utils/accessScope.ts');
const getContext = async (scope_level, company_ids) => toCompanyContextDto(await getCompanyContext({ scope_level, company_ids }));

beforeEach(() => { queries = []; });

test('system no recibe árbol de membresías', async () => {
    const { companies: tree } = await getContext(1, []);
    assert.deepEqual(tree, []);
    assert.equal(queries.length, 0);
});

test('super admin recibe su alcance expandido y la moneda del país de cada sucursal', async () => {
    const { companies: tree } = await getContext(2, [10, 11, 12]);
    assert.equal(tree.length, 1);
    assert.equal(tree[0].access, true);
    assert.deepEqual(tree[0].sucursales.map((node) => node.name), ['Bogotá', 'Lima']);
    assert.deepEqual(tree[0].sucursales.map((node) => node.currency.code), ['COP', 'PEN']);
    assert.equal(tree[0].country.isoCode, 'PE');
    assert.equal(tree[0].sucursales[0].country.isoCode, 'CO');
    assert.equal(tree[0].sucursales[0].currency.symbol, '$');
    assert.deepEqual(tree[0].sucursales[1].spaces.map((node) => node.name), ['Cancha A', 'Cancha B']);
    assert.ok(tree[0].sucursales.every((node) => node.access && node.spaces.every((space) => space.access)));
    assert.equal(queries.length, 2);
});

for (const level of [3, 4]) {
    test(`nivel ${level}: contexto informativo de todas las entidades del tenant resuelto`, async () => {
        const { companies: tree } = await getContext(level, [10, 11, 12, 20, 21]);
        assert.deepEqual(tree.map((node) => node.publicId), ['company-10', 'company-20']);
        assert.ok(tree.every((node) => node.access));
        assert.deepEqual(tree.flatMap((node) => node.sucursales.map((s) => s.publicId)), ['company-12', 'company-11', 'company-21']);
        assert.ok(tree.flatMap((node) => node.sucursales).every((node) => node.access));
        assert.ok(JSON.stringify(tree).includes('space-3'));
        assert.deepEqual(queries[1].query.where.sucursal_id[Op.in], [12, 11, 21]);
    });
}

test('múltiples asignaciones del mismo tenant no duplican el padre', async () => {
    const { companies: tree } = await getContext(3, [10, 11, 12]);
    assert.equal(tree.length, 1);
    assert.equal(tree[0].access, true);
    assert.equal(tree[0].sucursales.length, 2);
});

test('sin asignaciones devuelve un árbol vacío y no hace consultas globales', async () => {
    for (const level of [2, 3, 4, null]) {
        assert.deepEqual(await getContext(level, []), { companies: [] });
        assert.deepEqual(await getContext(level, undefined), { companies: [] });
    }
    assert.equal(queries.length, 0);
});

test('el alcance de empresa no se expande otra vez al armar el contexto', async () => {
    const { companies: tree } = await getContext(2, [10]);
    assert.equal(tree[0].access, true);
    assert.deepEqual(tree[0].sucursales, []);
    assert.equal(queries.length, 1);
});

test('un permiso no amplía el contexto fuera de los IDs resueltos', async () => {
    const tree = await getCompanyContext({ scope_level: 3, company_ids: [10, 11], permissions: ['system.full_access'] });
    assert.equal(tree.length, 1);
    assert.equal(tree[0].access, true);
    assert.equal(tree[0].sucursales.length, 1);
});

test('el DTO del login incluye contexto sin exponer IDs internos, tenant ni documentos', async () => {
    const context = await getCompanyContext({ scope_level: 2, company_ids: [10, 11, 12] });
    const login = toLoginAdminDto({
        token: 'token', permissions: ['space.view'], scopeLevel: 2, context,
        user: { public_id: 'user-1', first_name: 'User', last_name: null, email: 'user@example.test', roleRef: { key: 'super_admin' }, password: 'secret' },
    });
    assert.equal(login.context.companies[0].country.id, 1);
    assert.equal(login.scopeLevel, 2);
    assert.deepEqual(Object.keys(login).sort(), ['context', 'permissions', 'scopeLevel', 'token', 'user']);
    assert.equal('companyIds' in login, false);
    assert.equal(login.context.companies[0].sucursales.length, 2);
    assert.doesNotMatch(JSON.stringify(login.context), /company_id|parent_company_id|sucursal_id|space_id|tenant_id|private-|document/);
    assert.doesNotMatch(JSON.stringify(login), /password|secret/);
});

test('modificar access del contexto no amplía el alcance que valida el backend', async () => {
    const user = { scope_level: 3, company_ids: [11] };
    const context = toCompanyContextDto(await getCompanyContext(user));
    context.companies[0].access = true;
    context.companies[0].sucursales.push({ publicId: 'company-12', access: true });
    const requestUser = { ...user, context };
    assert.doesNotThrow(() => assertCompanyScope(requestUser, 11));
    assert.throws(() => assertCompanyScope(requestUser, 10), { statusCode: 403 });
    assert.throws(() => assertCompanyScope(requestUser, 12), { statusCode: 403 });
    assert.throws(() => assertCompanyScope({ ...requestUser, company_ids: [] }, 11), { statusCode: 403 });
});

test('país ausente no genera una moneda peruana por defecto', () => {
    const node = { entity: { ...alpha, country: null }, access: false, sucursales: [
        { entity: { ...companies[3], country: null }, access: true, spaces: [] },
    ] };
    const result = toCompanyContextDto([node]);
    assert.equal(result.companies[0].country, null);
    assert.equal(result.companies[0].sucursales[0].currency, null);
});

test('el árbol completo del dueño conserva empresas hermanas e identifica la primaria', async () => {
    const { companies: tree } = await getContext(2, [10, 11, 12, 20, 21]);
    assert.equal(tree.length, 2);
    assert.deepEqual(tree.map((c) => c.isPrimary), [true, false]);
    assert.equal(tree.flatMap((c) => c.sucursales).length, 3);
});
