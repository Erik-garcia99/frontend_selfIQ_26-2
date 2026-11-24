import assert from 'node:assert/strict';
import test from 'node:test';

process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid';
const { apiRequest, ApiError, setUnauthorizedHandler } = await import('../src/services/http.js');
const { describeError } = await import('../src/utils/errorMessages.js');
const { canApprove, canManage, canCreateBranch } = await import('../src/utils/validation.js');
const { canOpenStaffRoute, visiblePanelSections } = await import('../src/utils/staffAccess.js');

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

test('un 401 renueva la sesión, reintenta una vez y conserva idempotencia y versión', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1
      ? jsonResponse(401, { detail: 'Token expirado' })
      : jsonResponse(200, { ok: true });
  };
  setUnauthorizedHandler(async () => 'token-renovado');
  try {
    const data = await apiRequest('/branches/b-1/devices', {
      method: 'PATCH',
      accessToken: 'token-viejo',
      headers: { 'Idempotency-Key': 'abc-123' },
      body: { name: 'Cámara', base_version: 4 },
    });
    assert.deepEqual(data, { ok: true });
    assert.equal(calls.length, 2, 'debe reintentar exactamente una vez');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer token-viejo');
    assert.equal(calls[1].options.headers.Authorization, 'Bearer token-renovado');
    assert.equal(calls[1].options.headers['Idempotency-Key'], 'abc-123');
    assert.equal(calls[1].options.body, JSON.stringify({ name: 'Cámara', base_version: 4 }));
  } finally {
    globalThis.fetch = original;
    setUnauthorizedHandler(null);
  }
});

test('sin token renovado propaga el 401 y NO reintenta', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return jsonResponse(401, { detail: 'Sesión vencida' }); };
  setUnauthorizedHandler(async () => null);
  try {
    await assert.rejects(
      () => apiRequest('/auth/me', { accessToken: 'token-viejo' }),
      (err) => err instanceof ApiError && err.status === 401
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
    setUnauthorizedHandler(null);
  }
});

test('las rutas de autenticación nunca se reintentan', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return jsonResponse(401, { detail: 'Credenciales incorrectas' }); };
  setUnauthorizedHandler(async () => 'token-nuevo');
  try {
    await assert.rejects(() => apiRequest('/auth/login', {
      method: 'POST', accessToken: 'x', body: { email: 'a@b.c', password: 'mala' },
    }));
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
    setUnauthorizedHandler(null);
  }
});

test('errores estructurados: code, details y request_id, y 403 con mensaje claro', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse(403, {
    detail: 'No tienes permisos para aprobar usuarios',
    code: 'forbidden',
    details: { role: 'employee' },
    request_id: 'req-42',
  });
  try {
    await assert.rejects(
      () => apiRequest('/auth/pending', { accessToken: 'token' }),
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.code, 'forbidden');
        assert.deepEqual(err.details, { role: 'employee' });
        assert.equal(err.requestId, 'req-42');
        return true;
      }
    );
    const info = describeError({ status: 403, message: 'No tienes permisos para aprobar usuarios' });
    assert.equal(info.title, 'Sin permiso');
    assert.match(info.message, /permiso/i);
  } finally {
    globalThis.fetch = original;
  }
});

test('la matriz oculta aprobar usuarios a gerencia, pero conserva dispositivos', () => {
  const gerencia = { role: 'gerencia' };
  assert.equal(canManage(gerencia), true);
  assert.equal(canApprove(gerencia), false, 'gerencia no aprueba cuentas (owner/rh/sudo)');
  const deviceRoutes = new Set(['devices', 'products', 'approve', 'tokens', 'branch', 'test-product-light']);
  assert.equal(canOpenStaffRoute('approve', gerencia, deviceRoutes), false);
  assert.equal(canOpenStaffRoute('tokens', gerencia, deviceRoutes), true);
  assert.equal(canOpenStaffRoute('devices', gerencia, deviceRoutes), true);
  assert.equal(canOpenStaffRoute('test-product-light', gerencia, deviceRoutes), true);
  const sections = visiblePanelSections(gerencia);
  assert.equal(sections.approve, false);
  assert.equal(sections.operations, true);
  assert.equal(sections.branch, false);
  assert.equal(canCreateBranch({ role: 'owner' }), true);
});

test('empleado sin permisos no ve herramientas administrativas', () => {
  const employee = { role: 'employee' };
  const sections = visiblePanelSections(employee);
  assert.deepEqual(sections, { operations: false, approve: false, tokens: false, logs: false,
    people: false, branch: false });
  const deviceRoutes = new Set(['devices', 'products', 'approve', 'tokens', 'branch']);
  assert.equal(canOpenStaffRoute('devices', employee, deviceRoutes), false);
  assert.equal(canOpenStaffRoute('shelves', employee, deviceRoutes), true, 'el hub de repisas es lectura para empleados');
  assert.equal(canOpenStaffRoute('home', employee, deviceRoutes), true);
  assert.equal(canApprove({ role: 'sudo', is_superuser: true }), true);
});
