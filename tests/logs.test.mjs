import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('logsService reutiliza el cliente HTTP y pide lista, historial y CSV', () => {
  const service = source('../src/services/logsService.js');
  assert.ok(service.includes("from './http.js'"), 'No crea otro cliente HTTP');
  assert.ok(service.includes('apiRequest'));
  assert.ok(service.includes('/logs'));
  assert.ok(service.includes('/logs/nodes/'));
  assert.ok(service.includes('/logs/export'));
  assert.ok(service.includes('node_id'));
});

test('la bitácora es consultable, filtrable y exportable desde Panel', () => {
  const screen = source('../src/screens/admin/LogsScreen.js');
  for (const label of ['Buscar', 'Limpiar filtros', 'Descargar CSV', 'Ver solo este nodo']) {
    assert.ok(screen.includes(label), `Falta ${label}`);
  }
  assert.ok(screen.includes('asSince') && screen.includes('asUntil'), 'Fechas con zona horaria');
  const navigator = source('../src/app/AppNavigator.js');
  assert.ok(navigator.includes('logs: Logs'));
  const panel = source('../src/screens/PanelScreen.js');
  assert.ok(panel.includes('Bitácora'));
  assert.ok(panel.includes("go('logs')"));
  const access = source('../src/utils/staffAccess.js');
  assert.ok(access.includes("route === LOGS_ROUTE"), 'Ruta oculta a quien no administra');
  assert.ok(access.includes('logs: canManage(user)'));
});
