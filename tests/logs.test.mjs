import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { dirname } from 'node:path';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const { transformSync } = expoRequire('@babel/core');
const filename = new URL('../src/services/logsService.js', import.meta.url).pathname;

function loadService() {
  let lastPath = '';
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(dirname(filename));
  mod.require = (id) => {
    if (id === './http.js') return {
      API_BASE_URL: 'http://test',
      apiRequest: async (path) => { lastPath = path; return { items: [] }; },
    };
    return require(id);
  };
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: [expoRequire.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  mod._compile(code, filename);
  return { service: mod.exports.logsService, path: () => lastPath };
}

test('logsService reutiliza el cliente HTTP y pide lista, historial y CSV', () => {
  const service = source('../src/services/logsService.js');
  assert.ok(service.includes("from './http.js'"), 'No crea otro cliente HTTP');
  assert.ok(service.includes('apiRequest'));
  assert.ok(service.includes('/logs'));
  assert.ok(service.includes('/logs/nodes/'));
  assert.ok(service.includes('/logs/export'));
  assert.ok(service.includes('node_id'));
});

test('la URL de la lista lleva ? aunque no haya filtros', async () => {
  const { service, path } = loadService();
  await service.list({ branchId: 'b1', accessToken: 't' });
  assert.equal(path(), '/branches/b1/logs?offset=0&limit=50');
  await service.list({ branchId: 'b1', accessToken: 't',
    filters: { since: '2026-11-01T00:00:00Z', nodeId: 'n1' }, offset: 50 });
  assert.equal(path(), '/branches/b1/logs?since=2026-11-01T00%3A00%3A00Z&node_id=n1&offset=50&limit=50');
  await service.nodeHistory({ branchId: 'b1', nodeId: 'n1', accessToken: 't' });
  assert.equal(path(), '/branches/b1/logs/nodes/n1?offset=0&limit=50');
});

test('la bitácora es consultable, filtrable y exportable desde Panel', () => {
  const screen = source('../src/screens/admin/LogsScreen.js');
  for (const label of ['Buscar', 'Ver todo el historial', 'Descargar CSV', 'Ver solo este nodo']) {
    assert.ok(screen.includes(label), `Falta ${label}`);
  }
  assert.ok(screen.includes('setApplied'), 'Escribir no dispara la búsqueda; solo Buscar/Ver todo');
  assert.ok(screen.includes(", [load, token])"), 'La recarga depende de la acción explícita');
  assert.ok(!screen.includes('[branchId, accessToken, filters]'), 'filters ya no dispara red');
  assert.ok(screen.includes('asSince') && screen.includes('asUntil'), 'Fechas con zona horaria');
  assert.ok(screen.includes('localOffset()'), 'Filtro en hora local, no UTC');
  assert.ok(!screen.includes('T00:00:00Z'), 'Ya no se filtra con Z');
  assert.ok(screen.includes('useDevices'), 'Usa la sucursal seleccionada, no user.branch_id');
  assert.ok(screen.includes('d.branchId'));
  assert.ok(!screen.includes('user?.branch_id'), 'sudo no tiene branch_id fijo');
  const navigator = source('../src/app/AppNavigator.js');
  assert.ok(navigator.includes('logs: Logs'));
  const panel = source('../src/screens/PanelScreen.js');
  assert.ok(panel.includes('Bitácora'));
  assert.ok(panel.includes("go('logs')"));
  const access = source('../src/utils/staffAccess.js');
  assert.ok(access.includes("route === LOGS_ROUTE"), 'Ruta oculta a quien no administra');
  assert.ok(access.includes('logs: canManage(user)'));
});
