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
  listShelves: [{
    id: 's1', name: 'Repisa A', location: 'Pasillo 1',
    productCount: 1, lightCount: 1, cameraName: null, cameraNodeId: null,
  }],
  listShelfProducts: [{ id: 'p1', sku: 'SKU-1', name: 'Leche', physicalConfigured: false }],
  listProducts: [{ id: 'p2', sku: 'SKU-2', name: 'Pan', physicalConfigured: true }],
  listDevices: [],
  readShelf: {
    id: 's1', name: 'Repisa A', location: 'Pasillo 1', cameraNodeId: null, cameraName: null,
    products: [{ id: 'p1', sku: 'SKU-1', name: 'Leche', physicalConfigured: false }],
    lights: [{
      id: 'l1', name: 'Luz 1', channel: 0, nodeId: 'n1',
      products: [{ id: 'p1', name: 'Leche', sku: 'SKU-1' }],
    }],
  },
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
    if (id === 'react-native') return rn;
    if (id === '../../utils/errorMessages') return { describeError: error => ({ message: error.message }) };
    if (id === '../../context/AuthContext') return { useAuth: () => ({ user: { role: 'owner' } }) };
    if (id === '../../utils/validation') return { canManage: () => true };
    if (id === '../../theme/colors') return { colors: { field: '#fff', border: '#ddd', navy: '#001D39', muted: '#587991', text: '#0A4174', blue: '#7BBDE8' } };
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

const domProps = props => Object.fromEntries(
  Object.entries(props).filter(([key]) => !key.startsWith('accessibility')),
);
const rn = {
  StyleSheet: { create: styles => styles },
  Modal: ({ children, visible }) => visible ? React.createElement('div', null, children) : null,
  Pressable: ({ children, style, ...props }) => React.createElement('div', {
    ...domProps(props), style: typeof style === 'function' ? style({ pressed: false }) : style,
  }, typeof children === 'function' ? children({ pressed: false }) : children),
  Text: ({ children, ...props }) => React.createElement('span', domProps(props), children),
  View: ({ children, ...props }) => React.createElement('div', domProps(props), children),
};

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

test('Pantalla de estantes: alta y aviso en lenguaje sencillo', () => {
  const Shelves = load('ShelvesScreen');
  const markup = renderToStaticMarkup(React.createElement(Shelves, { go: () => {} }));
  assert.ok(markup.includes('Crear repisa'));
  assert.ok(markup.includes('Repisa A'));
  assert.ok(markup.includes('Antes de empezar'));
  assert.ok(markup.includes('tamaño y su posición'));
  const screen = source('../src/screens/devices/ShelvesScreen.js');
  assert.ok(screen.includes('physicalConfigured'));
  assert.ok(!screen.includes('Antes de instalar hardware'), 'Sin tecnicismos en el aviso');
  assert.ok(!screen.includes('sin orientación ni medidas'));
});

test('el hub expande productos, luces y cámara sin pantalla de detalle', () => {
  const Shelves = load('ShelvesScreen');
  const markup = renderToStaticMarkup(React.createElement(Shelves, { go: () => {}, params: { shelfId: 's1' } }));
  assert.ok(markup.includes('1 productos'));
  assert.ok(markup.includes('1 LED'));
  assert.ok(markup.includes('Sin cámara'));
  assert.ok(markup.includes('Productos previstos'));
  assert.ok(markup.includes('Leche'));
  assert.ok(markup.includes('LED 1 · Luz 1'));
  assert.ok(markup.includes('Vincular cámara'));
  assert.ok(markup.includes('Editar nombre y ubicación'));
  assert.ok(!markup.includes('Seleccionar estante'), 'El hub no vuelve a pedir estante');
  const screen = source('../src/screens/devices/ShelvesScreen.js');
  assert.ok(screen.includes('withLight: !!light'), 'Quitar con LED requiere confirmación explícita');
  assert.ok(screen.includes('Inactivo'), 'Los productos inactivos se muestran, no se ocultan');
});

test('productos y luces son filas simples; las acciones aparecen al tocar', () => {
  const Shelves = load('ShelvesScreen');
  const markup = renderToStaticMarkup(React.createElement(Shelves, { go: () => {}, params: { shelfId: 's1' } }));
  assert.ok(markup.includes('Falta medir'), 'Dato corto del producto en la fila');
  assert.ok(markup.includes('Leche'), 'Dato corto de la luz en la fila');
  assert.ok(!markup.includes('Encender 10 s'), 'La prueba de luz no está en la fila');
  assert.ok(!markup.includes('Cambiar nombre'), 'La edición no está en la fila');
  assert.ok(!markup.includes('Quitar de la repisa'), 'La baja no está en la fila');
  const screen = source('../src/screens/devices/ShelvesScreen.js');
  assert.ok(screen.includes("setSheet({ type: 'product'"));
  assert.ok(screen.includes("setSheet({ type: 'light'"));
  assert.ok(screen.includes("view: 'products'"));
  assert.ok(screen.includes("view: 'name'"));
  assert.ok(screen.includes('import { Modal'), 'Las acciones viven en un panel emergente');
});

test('La cámara exige configuración física y permite ligar una repisa existente', () => {
  const zones = source('../src/screens/devices/ShelfZonesScreen.js');
  assert.ok(zones.includes('linkShelf(item.id)'));
  assert.ok(zones.includes('Configura los productos antes de calibrar'));
  assert.ok(!zones.includes("name: 'Repisa principal'"), 'Ya no se crea una repisa vacía al vuelo');
});
