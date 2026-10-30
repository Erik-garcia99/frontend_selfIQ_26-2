import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { occupancyPresentation } from '../src/utils/occupancy.js';

const current = (value, extra = {}) => ({
  branchId: 'branch-1', data: { occupancy: value, status: 'ok' }, ...extra,
});

test('aforo 0 se muestra como 0 personas', () => {
  assert.equal(occupancyPresentation(current(0)).label, '0');
  assert.equal(occupancyPresentation(current(0)).status, '0 personas');
});

test('aforo 1 usa singular', () => {
  assert.equal(occupancyPresentation(current(1)).status, '1 persona');
});

test('aforo 2 y 3 usan plural', () => {
  for (const value of [2, 3]) {
    assert.equal(occupancyPresentation(current(value)).label, String(value));
    assert.equal(occupancyPresentation(current(value)).status, `${value} personas`);
  }
});

test('sin lectura válida no inventa cero', () => {
  for (const value of [null, undefined, NaN, Infinity, '2', 1.5, -1]) {
    const result = occupancyPresentation(current(value));
    assert.equal(result.label, '—');
    assert.equal(result.tone, 'unavailable');
  }
});

test('lectura desactualizada conserva el valor', () => {
  const result = occupancyPresentation(current(2, { stale: true }));
  assert.equal(result.label, '2');
  assert.equal(result.status, 'Sin actualizar');
});

test('error conserva el último valor con estado de conexión', () => {
  const result = occupancyPresentation(current(2, { error: 'Error del proveedor' }));
  assert.equal(result.label, '2');
  assert.equal(result.status, 'Sin conexión');
});

test('carga y ausencia de sucursal tienen estado propio', () => {
  assert.equal(occupancyPresentation(current(null, { loading: true })).status, 'Cargando…');
  assert.equal(occupancyPresentation(current(null, { branchId: '' })).status, 'Sin sucursal');
});

test('Inicio incluye el indicador dentro de Aforo actual, sin tarjeta adicional', () => {
  const home = readFileSync(new URL('../src/screens/home/HomeScreen.js', import.meta.url), 'utf8');
  const card = home.split('\n').find((line) => line.includes('style={styles.current}'));
  assert.ok(card.includes('Aforo actual'));
  assert.ok(card.includes('<TemperatureIndicator telemetry={telemetry} />'));
  assert.equal(home.includes('TemperatureDetails'), false);
  assert.equal(home.includes('Monitoreo ambiental'), false);
});
