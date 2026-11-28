import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canEditMap, canManage } from '../src/utils/validation.js';
import { canOpenStaffRoute, visiblePanelSections } from '../src/utils/staffAccess.js';
import { areaFields, mapDraftError, resizeDraft } from '../src/utils/mapDraft.js';

process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid';
const { mapService } = await import('../src/services/mapService.js');

test('solo owner/gerente/gerencia/sudo editan mapa; RRHH conserva otros permisos', () => {
  for (const role of ['owner', 'manager', 'gerencia', 'sudo']) {
    const user = { role };
    assert.equal(canEditMap(user), true);
    assert.equal(visiblePanelSections(user).mapDraft, true);
    assert.equal(canOpenStaffRoute('map-draft', user), true);
  }
  for (const role of ['rh', 'employee', 'staff', 'customer', 'unknown']) {
    const user = { role };
    assert.equal(canEditMap(user), false);
    assert.equal(visiblePanelSections(user).mapDraft, false);
    assert.equal(canOpenStaffRoute('map-draft', user, new Set(['map-draft'])), false);
  }
  assert.equal(canEditMap({ is_superuser: true }), true);
  assert.equal(canManage({ role: 'rh' }), true);
  assert.equal(canEditMap(null), false);
});

test('el área usa unidades relativas y conserva figuras al cambiar dimensiones', () => {
  assert.deepEqual(areaFields(null), { width: '100', height: '100' });
  const elements = [{ id: 'figura', kind: 'rectangle' }];
  const initial = { schema_version: 1, width: 100, height: 100, elements };
  const resized = resizeDraft(initial, { width: '120,5', height: '80' });
  assert.deepEqual(resized, { schema_version: 1, width: 120.5, height: 80, elements });
  assert.equal(initial.width, 100);
  assert.deepEqual(resizeDraft(null, { width: '100', height: '100' }), {
    schema_version: 1, width: 100, height: 100, elements: [],
  });
  for (const width of ['', ' ', 'NaN', 'Infinity', '-1', '0', '10001', '0x10', 'abc']) {
    assert.throws(() => resizeDraft(null, { width, height: '100' }));
  }
});

test('servicio usa sucursal codificada, versión y cliente HTTP existente', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, text: async () => JSON.stringify({ version: 2 }) };
  };
  try {
    await mapService.readDraft({ branchId: 'branch/a', accessToken: 'token' });
    const document = resizeDraft(null, { width: '100', height: '80' });
    await mapService.saveDraft({ branchId: 'branch/a', accessToken: 'token', baseVersion: 1, document });
    assert.match(calls[0].url, /\/branches\/branch%2Fa\/map\/draft$/);
    assert.equal(calls[1].options.method, 'PUT');
    assert.equal(calls[1].options.headers.Authorization, 'Bearer token');
    assert.deepEqual(JSON.parse(calls[1].options.body), { base_version: 1, document });
    assert.throws(() => mapService.readDraft({ branchId: '' }), /sucursal/);
  } finally { globalThis.fetch = original; }
});

test('conflicto y falta de acceso no se presentan como guardado', () => {
  assert.match(mapDraftError({ status: 409 }), /Tus cambios siguen aquí.*Recarga/);
  assert.match(mapDraftError({ status: 403 }), /permiso/);
  assert.match(mapDraftError({ status: 404 }), /servidor/);
  assert.match(mapDraftError({ status: 422 }), /figuras/);
});

test('entrada móvil protegida, sin publicación ni modificaciones al mapa cliente', () => {
  const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(source('../src/screens/PanelScreen.js'), /access\.mapDraft.*Mapa del local/);
  assert.match(source('../src/app/AppNavigator.js'), /'map-draft': MapDraft/);
  const screen = source('../src/screens/maps/MapDraftScreen.js');
  assert.match(screen, /if \(!canEditMap\(user\)\)/);
  assert.match(screen, /baseVersion: saved\.version/);
  assert.match(screen, /if \(!mounted\.current\) return/);
  assert.match(screen, /if \(saved !== null\) return/);
  assert.match(screen, /Cambios sin guardar/);
  assert.match(screen, /if \(failure\?\.status === 409\) setConflict\(true\)/);
  assert.doesNotMatch(screen, /\/publish|expo-router|MQTT/);
});
