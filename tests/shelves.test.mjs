import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const { transformSync } = expoRequire('@babel/core');

const data = {
  listShelves: [{ id: 's1', name: 'Repisa A', location: 'Pasillo 1' }],
  listShelfProducts: [{ id: 'p1', sku: 'SKU-1', name: 'Leche', physicalConfigured: false }],
  listProducts: [{ id: 'p2', sku: 'SKU-2', name: 'Pan', physicalConfigured: true }],
  readShelf: { id: 's1', name: 'Repisa A', location: 'Pasillo 1', products: [], lights: [] },
};
const wrap = ({ children }) => React.createElement('div', null, children);
const ui = {
  Shell: ({ title, children }) => React.createElement('main', null, title, children),
  Copy: wrap, SectionLabel: wrap, FieldCard: wrap,
  Info: ({ title, children }) => React.createElement('section', null, title, children),
  Primary: ({ children, disabled }) => React.createElement('button', { disabled }, children),
  NavRow: ({ label }) => React.createElement('div', null, label),
  ErrorNotice: ({ message }) => message,
  LoadState: ({ state, children }) => state.error || (state.loading ? 'Cargando…' : children),
  useDevices: () => ({ mutate: async () => ({ id: 'ok' }) }),
  useData: operation => ({ loading: false, error: '', data: data[operation], reload: () => {} }),
};

function load(name) {
  const filename = fileURLToPath(new URL(`../src/screens/devices/${name}.js`, import.meta.url));
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(dirname(filename));
  mod.require = id => {
    if (id === './DeviceUI') return ui;
    if (id === 'react') return React;
    if (id === '../../utils/errorMessages') return { describeError: error => ({ message: error.message }) };
    return require(id);
  };
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: [
      [expoRequire.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
      expoRequire.resolve('@babel/plugin-transform-modules-commonjs'),
    ],
  });
  mod._compile(code, filename);
  return mod.exports.default;
}

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('el adapter expone el CRUD de repisas y la asociación de productos', () => {
  const adapter = source('../src/services/deviceAdapter.js');
  for (const name of ['createBranchShelf', 'readShelf', 'deleteShelf', 'addShelfProduct', 'removeShelfProduct']) {
    assert.ok(adapter.includes(`async ${name}(`), `Falta ${name} en el adapter`);
  }
  assert.ok(adapter.includes('physicalConfigured'), 'El catálogo debe conservar si el producto tiene config física');
});

test('la ruta shelves está cableada y el Panel ofrece el mosaico', () => {
  const navigator = source('../src/app/AppNavigator.js');
  assert.ok(navigator.includes('shelves: Shelves'));
  assert.ok(navigator.includes("'products', 'shelves'"));
  const panel = source('../src/screens/PanelScreen.js');
  assert.ok(panel.includes("go('shelves')"));
});

test('Pantalla de estantes: alta y aviso de configuración física antes de hardware', () => {
  const Shelves = load('ShelvesScreen');
  const markup = renderToStaticMarkup(React.createElement(Shelves, { go: () => {} }));
  assert.ok(markup.includes('Crear repisa'));
  assert.ok(markup.includes('Repisa A'));
  assert.ok(markup.includes('Antes de instalar hardware'));
  const screen = source('../src/screens/devices/ShelvesScreen.js');
  assert.ok(screen.includes('physicalConfigured'));
  assert.ok(screen.includes('sin orientación ni medidas'));
});

test('La cámara exige configuración física y permite ligar una repisa existente', () => {
  const zones = source('../src/screens/devices/ShelfZonesScreen.js');
  assert.ok(zones.includes('linkShelf(item.id)'));
  assert.ok(zones.includes('Configura los productos antes de calibrar'));
  assert.ok(!zones.includes("name: 'Repisa principal'"), 'Ya no se crea una repisa vacía al vuelo');
});
