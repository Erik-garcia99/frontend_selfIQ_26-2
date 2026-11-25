import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { configDraft, numberField, roiConfigBody, specBody } from '../src/utils/physicalConfig.js';

const spec = { width_mm: 60, height_mm: 120, depth_mm: 60, usual_orientation: 'upright', version: 0 };
const config = { visual_capacity_units: 6, threshold_empty_pct: 5, threshold_low_pct: 25,
  threshold_medium_pct: 60, confirm_samples: 3, virtual_slots_enabled: false,
  slots_rows: null, slots_cols: null, version: 0 };
const productId = '22222222-2222-4222-8222-222222222222';

test('dimensiones admiten decimales y coma, sin ceros ni valores ficticios', () => {
  const body = specBody({ ...configDraft(spec), width_mm: '60,5' }, 2);
  assert.equal(body.width_mm, 60.5);
  assert.equal(body.base_version, 2);
  for (const value of ['', '0', '-1', 'NaN', 'Infinity', '1e3', '100001']) {
    assert.throws(() => specBody({ ...configDraft(spec), width_mm: value }, 0), value);
  }
  assert.throws(() => specBody({ ...configDraft(spec), usual_orientation: '' }, 0));
});

test('ausencia no se convierte en cero y booleanos conservan tipo', () => {
  const draft = configDraft(config);
  assert.equal(draft.virtual_slots_enabled, false);
  assert.equal(draft.slots_rows, '');
  assert.equal(numberField('', 'Capacidad', { nullable: true }), null);
  assert.throws(() => numberField('', 'Dimensión'));
});

test('umbrales ordenados, muestras enteras y producto esperado viajan al backend', () => {
  const body = roiConfigBody(configDraft(config), 3, productId);
  assert.equal(body.expected_product_id, productId);
  assert.equal(body.base_version, 3);
  assert.equal(body.visual_capacity_units, 6);
  assert.equal(body.virtual_slots_enabled, false);
  for (const patch of [{ threshold_low_pct: '5' }, { threshold_medium_pct: '100' },
    { confirm_samples: '1.5' }, { visual_capacity_units: '0' }]) {
    assert.throws(() => roiConfigBody({ ...configDraft(config), ...patch }, 0, productId));
  }
});

test('cuadrícula activable, acotada y anulada al desactivar', () => {
  const draft = { ...configDraft(config), virtual_slots_enabled: true, slots_rows: '2', slots_cols: '3' };
  assert.equal(roiConfigBody(draft, 0, productId).slots_cols, 3);
  assert.throws(() => roiConfigBody({ ...draft, slots_rows: '' }, 0, productId));
  assert.throws(() => roiConfigBody({ ...draft, slots_rows: '16', slots_cols: '16' }, 0, productId));
  const disabled = roiConfigBody({ ...draft, virtual_slots_enabled: false }, 0, productId);
  assert.equal(disabled.slots_rows, null);
  assert.equal(disabled.slots_cols, null);
});

process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid';
const { physicalConfigService } = await import('../src/services/physicalConfigService.js');
test('servicio cloud usa bearer, PUT y versiones; no llama a hardware', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, text: async () => '{"application_status":"not_integrated"}' };
  };
  try {
    const api = physicalConfigService('test-token', 'branch/one');
    await api.getSpec(productId);
    await api.listRois(productId);
    await api.saveSpec(productId, specBody(configDraft(spec), 0));
    await api.saveRoi('roi/one', roiConfigBody(configDraft(config), 0, productId));
    assert.ok(calls[0].url.includes('/branches/branch%2Fone/products/'));
    assert.ok(calls[1].url.endsWith('/roi-configs'));
    assert.equal(calls[2].options.method, 'PUT');
    assert.equal(calls[3].options.headers.Authorization, 'Bearer test-token');
    assert.equal(JSON.parse(calls[3].options.body).base_version, 0);
    assert.ok(calls[3].url.endsWith('/rois/roi%2Fone/physical-config'));
    assert.equal(calls.some(call => /apply|snapshot|calibration|command/.test(call.url)), false);
  } finally {
    globalThis.fetch = original;
  }
});

test('conflicto del backend no se transforma en guardado exitoso', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 409, text: async () => '{"detail":"Recarga"}' });
  try {
    await assert.rejects(physicalConfigService('test', 'branch').saveRoi('roi', {}),
      error => error.status === 409 && error.message === 'Recarga');
  } finally {
    globalThis.fetch = original;
  }
});

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const { transformSync } = expoRequire('@babel/core');
const cache = new Map();
function loadSource(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename);
  cache.set(filename, mod);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(dirname(filename));
  mod.require = id => {
    if (id === 'react-native') return require('react-native-web');
    if (!id.startsWith('.')) return require(id);
    let path = resolve(dirname(filename), id);
    if (!extname(path)) path += '.js';
    if (/\.(png|jpg|jpeg)$/.test(path)) return { uri: 'test-asset.png', width: 24, height: 24 };
    return loadSource(path);
  };
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: [[expoRequire.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
      expoRequire.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  mod._compile(code, filename);
  return mod.exports;
}
const { default: Form, SpecForm, RoiForm } = loadSource(fileURLToPath(
  new URL('../src/screens/devices/PhysicalConfigForm.js', import.meta.url)));
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test('formulario no afirma aplicación en cámara ni pide referencia', () => {
  const html = render(Form, { branchId: 'branch', product: { id: productId, name: 'Producto' } });
  assert.ok(html.includes('Cargando configuración'));
  assert.equal(html.includes('Aplicado en la cámara'), false);
});

test('medidas y orientación tienen etiquetas; no incluyen SKU editable', () => {
  const html = render(SpecForm, { value: spec });
  for (const label of ['Ancho (mm)', 'Alto (mm)', 'Profundidad (mm)', 'De pie', 'Guardar medidas en el sistema']) {
    assert.ok(html.includes(label), label);
  }
  assert.equal(html.includes('Guardar y aplicar'), false);
});

test('configuración de zona muestra umbrales y solo despliega cuadrícula activada', () => {
  const roi = { name: 'Zona A', shelf_name: 'Estante', product_id: productId, config };
  const html = render(RoiForm, { roi });
  assert.ok(html.includes('Agotado hasta (%)'));
  assert.ok(html.includes('Guardar zona en el sistema'));
  assert.equal(html.includes('aria-label="Filas"'), false);
  const enabled = render(RoiForm, { roi: { ...roi, config: {
    ...config, virtual_slots_enabled: true, slots_rows: 2, slots_cols: 3,
  } } });
  assert.ok(enabled.includes('aria-label="Filas"'));
  assert.ok(enabled.includes('ni confirma soporte físico'));
});
