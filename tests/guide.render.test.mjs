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
let data;
let draft;
let mutations = [];
let failAssociation = false;
const wrap = ({ children }) => React.createElement('div', null, children);
const ui = {
  Shell: ({ title, children }) => React.createElement('main', null, title, children),
  Copy: wrap, SectionLabel: wrap, FieldCard: wrap,
  Info: ({ title, children }) => React.createElement('section', null, title, children),
  Primary: ({ children, disabled }) => React.createElement('button', { disabled }, children),
  ErrorNotice: ({ message }) => message,
  LoadState: ({ state, children }) => state.error || (state.loading ? 'Cargando…' : children),
  useDevices: () => ({
    device: { id: 'node', name: 'Mi ESP32' }, draft,
    setDraft: value => { draft = value; },
    mutate: async (operation, payload) => {
      mutations.push({ operation, payload });
      if (operation === 'assignGuideProduct' && failAssociation) throw new Error('Sin conexión');
      if (operation === 'addLight') {
        const light = { ...payload, id: 'created-light' };
        data.getGuide.lights.push(light);
        return light;
      }
      return { productId: payload.productId };
    },
  }),
  useData: operation => ({ loading: false, error: '', data: data[operation], reload: () => {} }),
  deviceLabel: device => device.name,
};

function load(name, react = React) {
  const filename = fileURLToPath(new URL(`../src/screens/devices/${name}.js`, import.meta.url));
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(dirname(filename));
  mod.require = id => {
    if (id === './DeviceUI') return ui;
    if (id === 'react') return react;
    if (id === '../../services/deviceService') return {
      validLight: value => !!value.name?.trim() && !!value.shelfId && value.channel != null,
    };
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

const NodeScreen = load('GuideNodeScreen');
const ProductsScreen = load('GuideProductsScreen');
const AddScreen = load('AddLightScreen');
const render = screen => renderToStaticMarkup(React.createElement(screen, { go: () => {} }));
function setup() {
  draft = { id: 'light-3' };
  mutations = [];
  failAssociation = false;
  data = {
    getGuide: { lights: [{ id: 'light-3', channel: 2, name: 'Luz 3', shelfId: 'shelf-3', shelfName: 'Estante 3' }] },
    listLightChannels: Array.from({ length: 8 }, (_, id) => ({ id, available: id !== 2 })),
    listGuideAssociations: [{ guidePointId: 'light-3', productId: 'old', productName: 'Agua' }],
    listProducts: [{ id: 'old', name: 'Agua' }, { id: 'new', name: 'Pan' }],
    listShelfGuideProducts: [{ id: 'old', name: 'Agua' }],
    listShelves: [{ id: 'shelf-3', name: 'Estante 3' }],
  };
}

test('muestra los 8 LED aunque solo haya uno configurado, con producto y acciones', () => {
  setup();
  const html = render(NodeScreen);
  for (let number = 1; number <= 8; number++) assert.ok(html.includes(`LED ${number}`));
  assert.ok(html.includes('Agua'));
  assert.ok(html.includes('Cambiar producto en la repisa'));
  assert.ok(html.includes('Configurar LED 4'));
  assert.ok(html.includes('8 LED · 1 ocupados · 0 configurados sin producto · 7 sin configurar'));
});

test('los ocho ocupados se pueden reutilizar sin agregar un noveno', () => {
  setup();
  data.getGuide.lights = data.listLightChannels.map(({ id }) => ({ id: `light-${id}`, channel: id }));
  data.listGuideAssociations = data.getGuide.lights.map(light => ({
    guidePointId: light.id, productId: light.id, productName: `Producto ${light.channel + 1}`,
  }));
  const html = render(NodeScreen);
  assert.ok(html.includes('Todos los LED están configurados'));
  assert.equal((html.match(/>Cambiar producto en la repisa<\/button>/g) || []).length, 8);
  assert.ok(!html.includes('Configurar LED 9'));
});

test('el reemplazo identifica producto anterior, LED físico y confirmación', () => {
  setup();
  const html = render(ProductsScreen);
  assert.ok(html.includes('Agua quedará sin LED'));
  assert.ok(html.includes('LED 3'));
  assert.ok(html.includes('Confirmar cambio de producto'));
  assert.ok(html.includes('Verifica su ubicación física'));
});

test('las asociaciones antiguas múltiples requieren limpieza explícita', () => {
  setup();
  data.listGuideAssociations.push({ guidePointId: 'light-3', productId: 'other', productName: 'Arroz' });
  const html = render(ProductsScreen);
  assert.ok(html.includes('Quitar Agua'));
  assert.ok(html.includes('Quitar Arroz'));
  assert.ok(html.includes('Quita los productos sobrantes'));
});

test('configurar conserva el LED elegido y muestra solo productos del estante', () => {
  setup();
  draft = { channel: 3, name: 'Luz 4', shelfId: 'shelf-3' };
  data.listProducts.push({ id: 'unrelated', name: 'Producto de otro estante' });
  const html = render(AddScreen);
  assert.ok(html.includes('Configurar LED 4'));
  assert.ok(html.includes('Agua'));
  assert.ok(!html.includes('Pan'));
  assert.ok(!html.includes('Producto de otro estante'));
  assert.ok(!html.includes('Elige una luz disponible'));
  assert.ok(!html.includes('Seleccionar estante'));
  assert.ok(html.includes('Guardar LED y asociar producto'));
});

test('el estante vacío se explica sin ofrecer productos de otro estante', () => {
  setup();
  draft = { channel: 3, name: 'Luz 4', shelfId: 'shelf-3' };
  data.listShelfGuideProducts = [];
  const html = render(AddScreen);
  assert.ok(html.includes('Este estante todavía no tiene productos asociados a la guía'));
  assert.ok(html.includes('Elegir otro producto del catálogo'));
  assert.ok(!html.includes('Registra los productos en sus zonas'));
  assert.ok(!html.includes('Pan'));
});

function findButton(tree, label) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === ui.Primary && tree.props.children === label) return tree.props;
  for (const child of React.Children.toArray(tree.props?.children)) {
    const found = findButton(child, label);
    if (found) return found;
  }
  return null;
}

function interactiveAdd(go, name = 'AddLightScreen') {
  const state = [];
  let cursor = 0;
  const Screen = load(name, {
    ...React,
    useState: initial => {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = value; }];
    },
  });
  return () => { cursor = 0; return Screen({ go }); };
}

test('seleccionar estante y producto guarda el canal original y su asociación', async () => {
  setup();
  draft = { channel: 3, name: 'Luz 4', shelfId: null, mode: 'add' };
  let destination;
  const screen = interactiveAdd(next => { destination = next; });
  findButton(screen(), 'Estante 3').onPress();
  findButton(screen(), 'Elegir otro producto del catálogo').onPress();
  findButton(screen(), 'Pan').onPress();
  const save = findButton(screen(), 'Guardar LED y asociar producto');
  assert.equal(save.disabled, false);
  await save.onPress();
  assert.equal(mutations[0].operation, 'addLight');
  assert.equal(mutations[0].payload.channel, 3);
  assert.equal(mutations[0].payload.shelfId, 'shelf-3');
  assert.deepEqual(mutations[1], {
    operation: 'assignGuideProduct', payload: { productId: 'new', guidePointId: 'created-light' },
  });
  assert.equal(destination, 'guide');
});

test('si falla la asociación se informa y reintentar no crea otro LED', async () => {
  setup();
  draft = { channel: 3, name: 'Luz 4', shelfId: 'shelf-3' };
  let destination;
  const screen = interactiveAdd(next => { destination = next; });
  findButton(screen(), 'Elegir otro producto del catálogo').onPress();
  findButton(screen(), 'Pan').onPress();
  failAssociation = true;
  await findButton(screen(), 'Guardar LED y asociar producto').onPress();
  assert.equal(destination, undefined);
  assert.equal(draft.id, 'created-light');
  assert.ok(renderToStaticMarkup(screen()).includes('no se confirmó la asociación'));
  failAssociation = false;
  await findButton(screen(), 'Guardar LED y asociar producto').onPress();
  assert.equal(mutations.filter(item => item.operation === 'addLight').length, 1);
  assert.equal(destination, 'guide');
});

test('configurar un LED sin cámara ni ROI permite asociar directamente un producto del catálogo', async () => {
  setup();
  data.listShelfGuideProducts = [];
  data.listGuideAssociations = [];
  draft = { channel: 3, name: 'Luz 4', shelfId: 'shelf-3' };
  const screen = interactiveAdd(() => {});
  findButton(screen(), 'Elegir otro producto del catálogo').onPress();
  findButton(screen(), 'Pan').onPress();
  const save = findButton(screen(), 'Guardar LED y asociar producto');
  assert.equal(save.disabled, false);
  await save.onPress();
  assert.deepEqual(mutations.map(item => item.operation), ['addLight', 'assignGuideProduct']);
  assert.equal(mutations[1].payload.productId, 'new');
});

test('reemplazar producto usa el catálogo aunque el estante no tenga zonas de cámara', async () => {
  setup();
  const screen = interactiveAdd(() => {}, 'GuideProductsScreen');
  findButton(screen(), 'Elegir otro producto del catálogo').onPress();
  findButton(screen(), 'Pan').onPress();
  const save = findButton(screen(), 'Confirmar cambio de producto');
  assert.equal(save.disabled, false);
  await save.onPress();
  assert.deepEqual(mutations[0], {
    operation: 'assignGuideProduct',
    payload: { productId: 'new', guidePointId: 'light-3', replaceProductId: 'old' },
  });
});
