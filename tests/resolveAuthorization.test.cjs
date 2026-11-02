// node --require tsx/cjs tests/resolveAuthorization.test.cjs
// JWT y middlewares reales; persistencia y resolución de autorización simuladas.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../src/shared/errors/CustomErrors.ts');
const { assertCompanyScope } = require('../src/shared/utils/accessScope.ts');

process.env.JWT_SECRET = 'authorization-test-secret';
let activeSession;
let authorization;
let resolverError;
let sessionError;
let resolvedUsers;
let sessionChecks;

require.cache[require.resolve('../src/modules/auth/repository/authSession.repository.ts')] = {
    exports: { findActive: async (jti, userId) => {
        sessionChecks.push({ jti, userId });
        if (sessionError) throw sessionError;
        return activeSession;
    } },
};
require.cache[require.resolve('../src/modules/auth/service/authorizationResolver.service.ts')] = {
    exports: { resolveAuthorization: async (userId) => {
        resolvedUsers.push(userId);
        if (resolverError) throw resolverError;
        return authorization;
    } },
};

const { resolveAuthorization } = require('../src/modules/auth/middlewares/resolveAuthorization.ts');
const sign = (claims = {}, options = {}) => jwt.sign({
    user_id: 7, role_id: 2, app: 'admin', ...claims,
}, process.env.JWT_SECRET, {
    algorithm: 'HS256', expiresIn: '5m', jwtid: '12345678-1234-4234-8234-123456789abc', ...options,
});
const invoke = async (permissions, token = sign(), extra = {}) => {
    const req = { headers: token === null ? {} : { authorization: `Bearer ${token}` }, ...extra };
    const calls = [];
    await resolveAuthorization(...permissions)(req, {}, (error) => calls.push(error));
    assert.equal(calls.length, 1, 'next debe ejecutarse exactamente una vez');
    return { req, error: calls[0] };
};

beforeEach(() => {
    activeSession = true;
    authorization = {
        roleId: 3, roleKey: 'administrador', scopeLevel: 3,
        permissions: ['company.edit'], companyIds: [11],
    };
    resolverError = null;
    sessionError = null;
    resolvedUsers = [];
    sessionChecks = [];
});

test('autentica, resuelve la autorización vigente y permite la acción solicitada', async () => {
    const { req, error } = await invoke(['company.edit']);
    assert.equal(error, undefined);
    assert.deepEqual(resolvedUsers, [7]);
    assert.equal(sessionChecks.length, 1);
    assert.equal(sessionChecks[0].userId, 7);
    assert.equal(req.user.role_id, 3);
    assert.equal(req.user.role, 'administrador');
    assert.equal(req.user.scope_level, 3);
    assert.deepEqual(req.user.company_ids, [11]);
    assert.deepEqual(req.user.permissions, ['company.edit']);
});

test('sin argumentos autentica y resuelve alcance aunque no existan permisos de acción', async () => {
    authorization.permissions = [];
    const { req, error } = await invoke([]);
    assert.equal(error, undefined);
    assert.deepEqual(req.user.company_ids, [11]);
    assert.deepEqual(resolvedUsers, [7]);
});

test('varios permisos conservan la semántica OR: basta uno de ellos', async () => {
    authorization.permissions = ['user.employee_manage'];
    const { error } = await invoke(['user.manage_all', 'user.employee_manage']);
    assert.equal(error, undefined);
});

test('sin ninguno de los permisos exigidos responde 403 con los requisitos originales', async () => {
    authorization.permissions = ['company.view'];
    const { error } = await invoke(['company.edit', 'company.create']);
    assert.equal(error.statusCode, 403);
    assert.deepEqual(error.details, { required: ['company.edit', 'company.create'] });
});

test('system.full_access permite la acción pero no amplía el alcance de entidades', async () => {
    authorization.permissions = ['system.full_access'];
    const { req, error } = await invoke(['company.edit']);
    assert.equal(error, undefined);
    assert.doesNotThrow(() => assertCompanyScope(req.user, 11));
    assert.throws(() => assertCompanyScope(req.user, 12), { statusCode: 403 });
});

test('scope_level 1 por sí solo no sustituye el permiso de acción', async () => {
    authorization.scopeLevel = 1;
    authorization.permissions = [];
    const { error } = await invoke(['company.edit']);
    assert.equal(error.statusCode, 403);
});

test('no acepta permisos ni alcance antiguos del JWT ni enviados en el body', async () => {
    authorization.permissions = [];
    const token = sign({ permissions: ['system.full_access'], scope_level: 1, company_ids: [999] });
    const { req, error } = await invoke(['company.edit'], token, {
        body: { permissions: ['company.edit'], access: true, company_ids: [999] },
    });
    assert.equal(error.statusCode, 403);
    assert.deepEqual(req.user.permissions, []);
    assert.deepEqual(req.user.company_ids, [11]);
    assert.equal(req.user.scope_level, 3);
});

test('cada petición consulta el resolver y refleja un permiso revocado', async () => {
    assert.equal((await invoke(['company.edit'])).error, undefined);
    authorization.permissions = [];
    assert.equal((await invoke(['company.edit'])).error.statusCode, 403);
    assert.deepEqual(resolvedUsers, [7, 7]);
});

test('sin token rechaza con 401 antes de resolver permisos, incluso sin permiso requerido', async () => {
    const { error } = await invoke([], null);
    assert.equal(error.statusCode, 401);
    assert.deepEqual(resolvedUsers, []);
    assert.deepEqual(sessionChecks, []);
});

test('un JWT inválido o expirado nunca llega al resolver', async () => {
    const invalid = await invoke(['company.edit'], 'invalid-token');
    assert.equal(invalid.error.name, 'JsonWebTokenError');
    const expired = await invoke(['company.edit'], sign({}, { expiresIn: -1 }));
    assert.equal(expired.error.name, 'TokenExpiredError');
    assert.deepEqual(resolvedUsers, []);
});

test('una sesión revocada se rechaza antes de consultar permisos', async () => {
    activeSession = false;
    const { error } = await invoke(['company.edit']);
    assert.equal(error.statusCode, 401);
    assert.deepEqual(resolvedUsers, []);
});

test('errores de persistencia del token se propagan y no ejecutan la acción', async () => {
    sessionError = new Error('session storage unavailable');
    const { error } = await invoke(['company.edit']);
    assert.equal(error, sessionError);
    assert.deepEqual(resolvedUsers, []);
});

test('usuario deshabilitado o error del resolver se propagan a next una sola vez', async () => {
    for (const failure of [new UnauthorizedError('Usuario deshabilitado'), new Error('resolver unavailable')]) {
        resolverError = failure;
        const { error } = await invoke(['company.edit']);
        assert.equal(error, failure);
    }
});

test('el catálogo sigue contando permisos simples y múltiples en las rutas migradas', () => {
    const { countPermissionUsageInRoutes } = require('../src/modules/system/utils/permissionUsage.ts');
    const usage = countPermissionUsageInRoutes();
    assert.equal(usage['company.edit'], 1);
    assert.equal(usage['space.business_hour_manage'], 4);
    assert.equal(usage['user.manage_all'], 4);
    assert.equal(usage['user.employee_manage'], 4);
});
