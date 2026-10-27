import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { temperaturePresentation } from '../src/utils/temperature.js';

const current = (value, extra = {}) => ({
  branchId: 'branch-1', data: { temperature_c: value, status: 'ok' }, ...extra,
});

test('azul solo por debajo de 15 °C, incluidos 0 y valores negativos', () => {
  for (const value of [-5, 0, 14.9]) {
    assert.equal(temperaturePresentation(current(value)).tone, 'cold');
  }
  assert.equal(temperaturePresentation(current(0)).label, '0 °C');
});

test('verde desde 15 °C hasta menos de 35 °C', () => {
  for (const value of [15, 20.6000004, 25, 34.9]) {
    assert.equal(temperaturePresentation(current(value)).tone, 'comfortable');
  }
});

test('rojo desde 35 °C inclusive, según el umbral elegido', () => {
  for (const value of [35, 36, 38, 40, 50]) {
    assert.equal(temperaturePresentation(current(value)).tone, 'hot');
  }
});

test('formatea la lectura de InfluxDB con un decimal', () => {
  assert.equal(temperaturePresentation(current(20.6000004)).label, '20.6 °C');
});

test('sin lectura válida no inventa cero ni indica agradable', () => {
  for (const value of [null, undefined, NaN, Infinity, '21']) {
    const result = temperaturePresentation(current(value));
    assert.equal(result.label, '— °C');
    assert.equal(result.tone, 'unavailable');
  }
});

test('lectura desactualizada conserva el valor sin mostrar verde', () => {
  const result = temperaturePresentation(current(21, { stale: true }));
  assert.equal(result.label, '21 °C');
  assert.equal(result.tone, 'unavailable');
  assert.equal(result.status, 'Sin actualizar');
  assert.equal(temperaturePresentation(current(21, { data: { temperature_c: 21, status: 'stale' } })).tone, 'unavailable');
});

test('error conserva la última lectura con estado neutro', () => {
  const result = temperaturePresentation(current(21, { error: 'Error del proveedor' }));
  assert.equal(result.label, '21 °C');
  assert.equal(result.tone, 'unavailable');
  assert.equal(result.status, 'Sin conexión');
});

test('carga y ausencia de sucursal tienen estado propio', () => {
  assert.equal(temperaturePresentation(current(null, { loading: true })).status, 'Cargando…');
  assert.equal(temperaturePresentation(current(null, { branchId: '' })).status, 'Sin sucursal');
});

test('Inicio incluye el indicador dentro de Aforo actual, sin tarjeta adicional', () => {
  const home = readFileSync(new URL('../src/screens/home/HomeScreen.js', import.meta.url), 'utf8');
  const card = home.split('\n').find((line) => line.includes('style={styles.current}'));
  assert.ok(card.includes('Aforo actual'));
  assert.ok(card.includes('<TemperatureIndicator telemetry={telemetry} />'));
  assert.equal(home.includes('TemperatureDetails'), false);
  assert.equal(home.includes('Monitoreo ambiental'), false);
});
