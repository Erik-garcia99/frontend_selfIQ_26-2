// Render/hook harness similar to guide.control.test.mjs; no native device here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as model from '../src/utils/mapDraft.js';
import * as editor from '../src/utils/mapEditor.js';

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const { transformSync } = expoRequire('@babel/core');
const wrap = ({ children }) => React.createElement('div', null, children);
const Preview = () => React.createElement('div', null, 'Vista previa del mapa');
const ui = {
  Screen: wrap,
  Head: ({ title }) => React.createElement('h1', null, title),
  Info: ({ title, children }) => React.createElement('section', null, title, children),
  Primary: ({ children, disabled }) => React.createElement('button', { disabled }, children),
  FieldCard: ({ label, value }) => React.createElement('label', null, label, value),
};
const initial = { branch_id: 'branch', version: 0, document: null };
const tick = () => new Promise(resolve => setImmediate(resolve));

function harness(service) {
  const values = [], effects = [], pending = [], alerts = [], destinations = [];
  let cursor = 0;
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
      return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    },
    useMemo(callback, deps) {
      const index = cursor++;
      const previous = values[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i])))
        values[index] = { deps, value: callback() };
      return values[index].value;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      const previous = effects[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        pending.push(() => {
          previous?.cleanup?.();
          effects[index] = { deps, cleanup: callback() };
        });
      }
    },
  };
  const filename = fileURLToPath(new URL('../src/screens/maps/MapDraftScreen.js', import.meta.url));
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(dirname(filename));
  mod.require = id => {
    if (id === 'react') return hooks;
    if (id === 'react-native') return {
      Text: wrap, View: wrap, ActivityIndicator: wrap,
      Alert: { alert: (...args) => alerts.push(args) },
      BackHandler: { addEventListener: () => ({ remove() {} }) },
    };
    if (id === '../../components/layout') return ui;
    if (id === '../../components/maps/MapViewport') return Preview;
    if (id === '../../services/mapService') return { mapService: service };
    if (id === '../../utils/mapDraft') return model;
    if (id === '../../utils/mapEditor') return editor;
    if (id === '../../utils/validation') return { canEditMap: () => true };
    if (id === '../../context/AuthContext' || id === '../../context/DeviceContext') return {};
    if (id === '../../theme/colors') return { colors: {} };
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
  const props = { branchId: 'branch', branchName: 'Sucursal', accessToken: 'token',
    go: value => destinations.push(value) };
  return {
    alerts, destinations, props,
    render() {
      cursor = 0;
      const tree = mod.exports.DraftWorkspace(props);
      while (pending.length) pending.shift()();
      return tree;
    },
    unmount() { effects.forEach(effect => effect?.cleanup?.()); },
  };
}

function find(tree, type, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === type && predicate(tree.props)) return tree.props;
  for (const child of React.Children.toArray(tree.props?.children)) {
    const result = find(child, type, predicate);
    if (result) return result;
  }
  return null;
}
const button = (tree, label) => find(tree, ui.Primary, props => props.children === label);
const field = (tree, label) => find(tree, ui.FieldCard, props => props.label === label);
const html = tree => renderToStaticMarkup(tree);

test('carga, guarda una vez ante doble toque y recupera versión confirmada', async () => {
  let resolveSave;
  const writes = [];
  const screen = harness({
    readDraft: async () => initial,
    saveDraft: payload => { writes.push(payload); return new Promise(resolve => { resolveSave = resolve; }); },
  });
  screen.render(); await tick();
  field(screen.render(), 'Ancho del área').onChangeText('120');
  const save = button(screen.render(), 'Guardar borrador').onPress;
  const pending = save();
  await save();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].baseVersion, 0);
  assert.equal(writes[0].document.width, 120);
  resolveSave({ ...initial, version: 1, document: writes[0].document });
  await pending;
  assert.match(html(screen.render()), /Borrador guardado/);
  assert.equal(button(screen.render(), 'Guardar borrador').disabled, true);
  screen.unmount();
});

test('409 conserva cambios y bloquea guardar hasta recargar con confirmación', async () => {
  let reads = 0;
  const screen = harness({
    readDraft: async () => { reads++; return initial; },
    saveDraft: async () => { throw { status: 409 }; },
  });
  screen.render(); await tick();
  field(screen.render(), 'Ancho del área').onChangeText('130');
  await button(screen.render(), 'Guardar borrador').onPress();
  assert.equal(field(screen.render(), 'Ancho del área').value, '130');
  assert.equal(button(screen.render(), 'Guardar borrador').disabled, true);
  button(screen.render(), 'Recargar versión guardada').onPress();
  assert.equal(reads, 1);
  const choices = screen.alerts.at(-1)[2];
  choices.find(choice => choice.text === 'Recargar').onPress();
  screen.render(); await tick();
  assert.equal(field(screen.render(), 'Ancho del área').value, '100');
  assert.equal(reads, 2);
  screen.unmount();
});

test('renovar token conserva el área editada y salir requiere confirmación', async () => {
  let reads = 0;
  const screen = harness({ readDraft: async () => { reads++; return initial; } });
  screen.render(); await tick();
  field(screen.render(), 'Largo del área').onChangeText('80');
  screen.props.accessToken = 'renewed';
  const tree = screen.render();
  await tick();
  assert.equal(reads, 1);
  assert.equal(field(screen.render(), 'Largo del área').value, '80');
  tree.props.go('panel');
  assert.deepEqual(screen.destinations, []);
  const choices = screen.alerts.at(-1)[2];
  choices.find(choice => choice.text === 'Salir sin guardar').onPress();
  assert.deepEqual(screen.destinations, ['panel']);
  screen.unmount();
});

test('una lectura tardía de una sucursal desmontada no cambia sus campos', async () => {
  let finish;
  const old = harness({ readDraft: () => new Promise(resolve => { finish = resolve; }) });
  old.render(); old.unmount();
  finish({ ...initial, version: 1, document: { width: 99, height: 80, elements: [] } });
  await tick();
  assert.equal(field(old.render(), 'Ancho del área'), null);
});

test('respuesta de guardado tras salir no muestra éxito en la pantalla desmontada', async () => {
  let finish;
  const screen = harness({
    readDraft: async () => initial,
    saveDraft: () => new Promise(resolve => { finish = resolve; }),
  });
  screen.render(); await tick();
  const pending = button(screen.render(), 'Guardar borrador').onPress();
  screen.unmount();
  finish({ ...initial, version: 1, document: { width: 100, height: 100, elements: [] } });
  await pending;
  assert.doesNotMatch(html(screen.render()), /Borrador guardado/);
});

test('el lienzo sigue el área local sin guardar, gestos no ensucian y entrada inválida no inventa tamaño', async () => {
  const screen = harness({ readDraft: async () => ({ ...initial, version: 1,
    document: { schema_version: 1, width: 100, height: 80, elements: [] } }) });
  screen.render(); await tick();
  assert.equal(find(screen.render(), Preview, () => true).document.width, 100);
  find(screen.render(), Preview, () => true).onGestureActive(true);
  assert.equal(screen.render().props.scrollEnabled, false);
  assert.equal(button(screen.render(), 'Guardar borrador').disabled, true);
  find(screen.render(), Preview, () => true).onGestureActive(false);
  assert.equal(screen.render().props.scrollEnabled, true);
  field(screen.render(), 'Ancho del área').onChangeText('150');
  assert.equal(find(screen.render(), Preview, () => true).document.width, 150);
  field(screen.render(), 'Ancho del área').onChangeText('');
  assert.equal(find(screen.render(), Preview, () => true), null);
  assert.match(html(screen.render()), /Revisa el tamaño del área/);
  screen.unmount();
});

test('agregar, mover, cambiar nombre y guardar conserva identidad y se recupera al reabrir', async () => {
  let stored = initial;
  const writes = [];
  const service = {
    readDraft: async () => stored,
    saveDraft: async payload => {
      writes.push(payload);
      stored = { ...initial, version: stored.version + 1, document: structuredClone(payload.document) };
      return stored;
    },
  };
  const screen = harness(service);
  screen.render(); await tick();
  button(screen.render(), 'Agregar rectángulo').onPress();
  const first = find(screen.render(), Preview, () => true).document.elements[0];
  assert.match(first.id, /^[\da-f-]{36}$/i);
  assert.equal(find(screen.render(), Preview, () => true).selectedElementId, first.id);
  field(screen.render(), 'Nombre de la figura').onChangeText('Estante de entrada');
  find(screen.render(), Preview, () => true).onMoveElement(first.id, 20, 30);
  assert.equal(find(screen.render(), Preview, () => true).document.elements[0].x, 20);
  assert.equal(button(screen.render(), 'Guardar borrador').disabled, false);
  await button(screen.render(), 'Guardar borrador').onPress();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].document.elements[0].id, first.id);
  assert.equal(writes[0].document.elements[0].label, 'Estante de entrada');
  screen.unmount();
  const reopened = harness(service);
  reopened.render(); await tick();
  assert.deepEqual(find(reopened.render(), Preview, () => true).document, stored.document);
  assert.equal(button(reopened.render(), 'Guardar borrador').disabled, true);
  reopened.unmount();
});

test('figuras inválidas bloquean guardado sin perderlas y quitar exige confirmación', async () => {
  let writes = 0;
  const screen = harness({ readDraft: async () => initial, saveDraft: async () => { writes++; } });
  screen.render(); await tick();
  button(screen.render(), 'Agregar rectángulo').onPress();
  const id = find(screen.render(), Preview, () => true).document.elements[0].id;
  field(screen.render(), 'Ancho de la figura').onChangeText('900');
  assert.equal(find(screen.render(), Preview, () => true), null);
  assert.equal(field(screen.render(), 'Ancho de la figura').value, '900');
  assert.equal(button(screen.render(), 'Guardar borrador').disabled, true);
  await button(screen.render(), 'Guardar borrador').onPress();
  assert.equal(writes, 0);
  field(screen.render(), 'Ancho de la figura').onChangeText('20');
  assert.equal(find(screen.render(), Preview, () => true).document.elements[0].id, id);
  button(screen.render(), 'Quitar figura').onPress();
  assert.equal(find(screen.render(), Preview, () => true).document.elements.length, 1);
  button(screen.render(), 'Conservar figura').onPress();
  assert.equal(find(screen.render(), Preview, () => true).document.elements.length, 1);
  button(screen.render(), 'Quitar figura').onPress();
  button(screen.render(), 'Confirmar eliminación').onPress();
  assert.equal(find(screen.render(), Preview, () => true).document.elements.length, 0);
  screen.unmount();
});

test('conflicto o fallo de red conserva todas las figuras locales y su aviso de salida', async () => {
  for (const status of [409, 503]) {
    const screen = harness({
      readDraft: async () => initial,
      saveDraft: async () => { throw { status }; },
    });
    screen.render(); await tick();
    button(screen.render(), 'Agregar rectángulo').onPress();
    const before = find(screen.render(), Preview, () => true).document;
    await button(screen.render(), 'Guardar borrador').onPress();
    assert.deepEqual(find(screen.render(), Preview, () => true).document, before);
    screen.render().props.go('panel');
    assert.deepEqual(screen.destinations, []);
    assert.equal(screen.alerts.at(-1)[0], 'Cambios sin guardar');
    screen.unmount();
  }
});
