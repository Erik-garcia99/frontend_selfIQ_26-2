import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = readFileSync(new URL('../src/screens/devices/guideControl.js', import.meta.url), 'utf8');
const model = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const { ledStateLabel, guideIsOpen, pollGuide } = model;

test('ON/OFF requiere respuesta explícita, no se inventa apagado por error o expiración', () => {
  assert.equal(ledStateLabel(null), 'Sin consultar');
  assert.equal(ledStateLabel({ light: 'on', status: 'active' }), 'ON');
  assert.equal(ledStateLabel({ light: 'off', status: 'cancelled' }), 'OFF');
  assert.equal(ledStateLabel({ light: 'unknown', status: 'expired' }), 'Desconocido');
  assert.equal(ledStateLabel({ light: 'unknown', status: 'failed' }), 'Desconocido');
  assert.equal(ledStateLabel({ closing: true, light: 'on' }), 'Apagando…');
  assert.equal(guideIsOpen({ status: 'pending' }), true);
  assert.equal(guideIsOpen({ status: 'active' }), true);
  assert.equal(guideIsOpen({ status: 'cancelled' }), false);
  assert.match(model.guideControlError({ status: 404, message: 'guide_association_missing' }), /asociación de guía/);
  assert.match(model.guideControlError({ status: 404, message: 'Not Found' }), /Actualiza el backend/);
  assert.match(model.guideControlError({ status: 503, message: 'guide_capabilities_missing' }), /no ha registrado los canales/);
});

test('polling serializado, termina en OFF y descarta respuestas tras salir', async () => {
  let resolve;
  const timers = [];
  const states = [];
  let calls = 0;
  const stop = pollGuide({
    load: () => { calls++; return new Promise(done => { resolve = done; }); },
    onState: state => states.push(state), onError: assert.fail,
    schedule: callback => { timers.push(callback); return callback; }, cancel: () => {},
  });
  assert.equal(calls, 1);
  assert.equal(timers.length, 0); // No hay segundo request mientras el primero espera.
  resolve({ status: 'active', light: 'on' });
  await Promise.resolve();
  assert.equal(timers.length, 1);
  const second = timers.shift()();
  resolve({ status: 'cancelled', light: 'off' });
  await second;
  assert.equal(timers.length, 0);
  assert.equal(states.length, 2);
  stop();

  const discard = pollGuide({
    load: () => new Promise(done => { resolve = done; }),
    onState: assert.fail, onError: assert.fail,
    schedule: assert.fail, cancel: () => {},
  });
  discard();
  resolve({ status: 'active', light: 'on' });
  await Promise.resolve();
});

test('un error de consulta conserva la posibilidad de reintento', async () => {
  const timers = [];
  const errors = [];
  const stop = pollGuide({
    load: async () => { throw new Error('sin red'); },
    onState: assert.fail, onError: error => errors.push(error),
    schedule: callback => { timers.push(callback); return callback; }, cancel: () => {},
  });
  await Promise.resolve();
  assert.equal(errors.length, 1);
  assert.equal(timers.length, 1);
  stop();
});

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const { transformSync } = expoRequire('@babel/core');
const wrap = ({ children }) => React.createElement('div', null, children);
const rows = [
  { id: 'p1', productId: 'p1', productName: 'Agua', nodeId: 'node-1', channel: 2, shelfName: 'Estante 3' },
  { id: 'p2', productId: 'p2', productName: 'Arroz', nodeId: 'node-2', channel: 0, shelfName: 'Estante 1' },
];
const ui = {
  Shell: ({ title, children }) => React.createElement('main', null, title, children),
  Copy: wrap, SectionLabel: wrap, FieldCard: wrap,
  Info: ({ title, children }) => React.createElement('section', null, title, children),
  Primary: ({ children, disabled }) => React.createElement('button', { disabled }, children),
  ErrorNotice: ({ message }) => message,
  LoadState: ({ children }) => children,
  useDevices: () => ({ draft: {}, branchId: 'branch' }),
  useData: operation => {
    assert.equal(operation, 'listGuideAssociations'); // No catálogo, estantes ni ROI.
    return { data: rows, loading: false, error: '', reload: () => {} };
  },
};
let offResponse = null;
let onCalls = [];
let offCalls = [];
let keySeq = 0;
const onState = payload => ({ id: `session-${payload.productId}`, status: 'active', light: 'on', remainingSeconds: 60 });
const service = {
  createGuideRequest: async payload => { onCalls.push(payload); return onState(payload); },
  getGuideRequest: async ({ requestId }) => ({ id: requestId, status: 'active', light: 'on', remainingSeconds: 60 }),
  cancelGuideRequest: async payload => {
    offCalls.push(payload);
    return offResponse || { id: payload.requestId, status: 'cancelled', light: 'off' };
  },
  newIdempotencyKey: () => `key-${++keySeq}`,
};
function load(react = React) {
  const filename = fileURLToPath(new URL('../src/screens/devices/TestProductLightScreen.js', import.meta.url));
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(dirname(filename));
  mod.require = id => {
    if (id === 'react') return react;
    if (id === './DeviceUI') return ui;
    if (id === './guideControl') return model;
    if (id === '../../context/AuthContext') return { useAuth: () => ({ accessToken: 'token' }) };
    if (id === '../../services/guideService') return service;
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
  return mod.exports.GuideControl;
}
const props = { go: () => {}, branchId: 'branch', accessToken: 'token', back: 'panel' };
test('el control lista asociaciones y LED, nunca productos sin LED ni zonas de cámara', () => {
  const Control = load();
  const html = renderToStaticMarkup(React.createElement(Control, props));
  assert.ok(html.includes('Control de LED'));
  assert.ok(html.includes('Agua'));
  assert.ok(html.includes('LED 3'));
  assert.ok(html.includes('ON · Encender LED 3'));
  assert.ok(html.includes('OFF · Apagar LED 3'));
  assert.ok(html.includes('Sin consultar'));
  const node = renderToStaticMarkup(React.createElement(Control, { ...props, nodeId: 'node-1' }));
  assert.ok(node.includes('Agua'));
  assert.ok(!node.includes('Arroz'));
});

function button(tree, label) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === ui.Primary && React.Children.toArray(tree.props.children).join('') === label) return tree.props;
  for (const child of React.Children.toArray(tree.props?.children)) {
    const found = button(child, label);
    if (found) return found;
  }
  return null;
}
function interactive() {
  const values = [];
  let cursor = 0;
  const Control = load({
    ...React,
    useEffect: () => {},
    useState: initial => {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value; }];
    },
    useRef: initial => {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    },
  });
  return () => { cursor = 0; return Control(props); };
}
test('ON permite varias sesiones simultáneas y cada OFF apaga la suya', async () => {
  onCalls = []; offCalls = [];
  const screen = interactive();
  const start = button(screen(), 'ON · Encender LED 3');
  await Promise.all([start.onPress(), start.onPress()]);
  assert.equal(onCalls.length, 1);
  assert.equal(onCalls[0].productId, 'p1');
  assert.equal(button(screen(), 'ON · Encender LED 1').disabled, false);
  await button(screen(), 'ON · Encender LED 1').onPress();
  assert.equal(onCalls.length, 2);
  assert.equal(onCalls[1].productId, 'p2');
  assert.ok(renderToStaticMarkup(screen()).includes('Estado: ON'));
  assert.equal(button(screen(), 'OFF · Apagar LED 3').disabled, false);
  assert.equal(button(screen(), 'OFF · Apagar LED 1').disabled, false);
  await button(screen(), 'OFF · Apagar LED 3').onPress();
  assert.equal(offCalls[0].requestId, 'session-p1');
  assert.ok(renderToStaticMarkup(screen()).includes('Estado: OFF'));
  assert.equal(button(screen(), 'OFF · Apagar LED 1').disabled, false);
  await button(screen(), 'OFF · Apagar LED 1').onPress();
  assert.equal(offCalls[1].requestId, 'session-p2');
});

test('OFF sin confirmación no muestra OFF ni libera ese canal', async () => {
  const screen = interactive();
  await button(screen(), 'ON · Encender LED 3').onPress();
  offResponse = { id: 'session-p1', status: 'active', closing: true, light: 'unknown' };
  await button(screen(), 'OFF · Apagar LED 3').onPress();
  assert.ok(renderToStaticMarkup(screen()).includes('Estado: Apagando'));
  assert.ok(!renderToStaticMarkup(screen()).includes('Estado: OFF'));
  assert.equal(button(screen(), 'ON · Encender LED 3').disabled, true);
  offResponse = null;
});
