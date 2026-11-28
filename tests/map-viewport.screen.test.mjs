// Pruebas de render y gestos simulados; no sustituyen pruebas táctiles nativas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as model from '../src/utils/mapViewport.js';

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const { transformSync } = expoRequire('@babel/core');
const wrap = ({ children }) => React.createElement('div', null, children);
const Scene = () => React.createElement('div', null, 'Dibujo del plano');

function load(path, replacements) {
  const filename = fileURLToPath(new URL(path, import.meta.url));
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(dirname(filename));
  mod.require = id => id in replacements ? replacements[id] : require(id);
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: [
      [expoRequire.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
      expoRequire.resolve('@babel/plugin-transform-modules-commonjs'),
    ],
  });
  mod._compile(code, filename);
  return mod.exports;
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree.props;
  for (const child of React.Children.toArray(tree.props?.children)) {
    const found = find(child, predicate);
    if (found) return found;
  }
  return null;
}

function harness(document = { width: 100, height: 100, elements: [] }, options = {}) {
  const slots = [], effects = [], pending = [], active = [];
  let index = 0, responders;
  const hooks = {
    ...React,
    useState(initial) {
      const key = index++;
      if (!(key in slots)) slots[key] = typeof initial === 'function' ? initial() : initial;
      return [slots[key], next => { slots[key] = typeof next === 'function' ? next(slots[key]) : next; }];
    },
    useRef(initial) {
      const key = index++;
      if (!(key in slots)) slots[key] = { current: initial };
      return slots[key];
    },
    useMemo(callback, deps) {
      const key = index++, previous = slots[key];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i])))
        slots[key] = { value: callback(), deps };
      return slots[key].value;
    },
    useEffect(callback, deps) {
      const key = index++, previous = effects[key];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) pending.push(() => {
        previous?.cleanup?.(); effects[key] = { deps, cleanup: callback() };
      });
    },
  };
  const component = load('../src/components/maps/MapViewport.js', {
    react: hooks,
    'react-native': {
      View: wrap, Text: wrap, Pressable: wrap,
      StyleSheet: { create: styles => styles, absoluteFill: {} },
      PanResponder: { create: callbacks => { responders = callbacks; return { panHandlers: {} }; } },
    },
    './MapScene': { __esModule: true, default: Scene },
    '../../theme/colors': { colors: {} },
    '../../utils/mapViewport': model,
  });
  const props = { document, onGestureActive: value => active.push(value), ...options };
  const render = () => {
    index = 0;
    const tree = component.MapViewportContent(props);
    while (pending.length) pending.shift()();
    return tree;
  };
  const layout = () => {
    find(render(), node => typeof node.props?.onLayout === 'function')
      .onLayout({ nativeEvent: { layout: { width: 320, height: 320 } } });
    return render();
  };
  return { render, layout, active, props,
    controls: () => responders,
    camera: () => find(render(), node => node.type === Scene).camera,
    unmount: () => effects.forEach(effect => effect?.cleanup?.()),
  };
}

const control = (tree, label) => find(tree, node => node.props?.label === label);
const event = points => ({ nativeEvent: { touches: points.map(([locationX, locationY]) => ({ locationX, locationY })) } });

test('visor vacío muestra el área, controles accesibles y no inventa muebles', () => {
  const screen = harness();
  assert.match(renderToStaticMarkup(screen.render()), /Preparando el área/);
  const tree = screen.layout();
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Vista previa del mapa/);
  assert.match(html, /Aún no hay figuras/);
  assert.equal(control(tree, 'Alejar mapa').disabled, true);
  control(tree, 'Acercar mapa').onPress();
  assert.equal(screen.camera().zoom, 1.5);
  control(screen.render(), 'Ajustar mapa a pantalla').onPress();
  assert.deepEqual(screen.camera(), { zoom: 1, x: 0, y: 0 });
  screen.unmount();
});

test('pellizco/arrastre no cambia geometría y siempre libera el scroll al terminar', () => {
  const doc = { width: 100, height: 100, elements: [] };
  const snapshot = JSON.stringify(doc);
  const screen = harness(doc);
  screen.layout();
  const gesture = screen.controls();
  gesture.onPanResponderGrant(event([[120, 160], [200, 160]]));
  assert.equal(screen.active.at(-1), true);
  gesture.onPanResponderMove(event([[80, 160], [240, 160]]));
  assert.equal(screen.camera().zoom, 2);
  gesture.onPanResponderRelease();
  assert.equal(screen.active.at(-1), false);
  screen.controls().onPanResponderGrant(event([[100, 100]]));
  screen.controls().onPanResponderMove(event([[130, 120]]));
  assert.equal(screen.camera().x, 30);
  assert.equal(screen.camera().y, 20);
  screen.controls().onPanResponderTerminate();
  assert.equal(screen.active.at(-1), false);
  assert.equal(JSON.stringify(doc), snapshot);
  screen.unmount();
  assert.equal(screen.active.at(-1), false);
});

test('cambiar de dos dedos a uno no salta la cámara; layout nuevo restablece ajuste', () => {
  const screen = harness();
  screen.layout();
  screen.controls().onPanResponderGrant(event([[120, 160], [200, 160]]));
  screen.controls().onPanResponderMove(event([[80, 160], [240, 160]]));
  const before = screen.camera();
  screen.controls().onPanResponderMove(event([[240, 160]]));
  assert.deepEqual(screen.camera(), before);
  screen.controls().onPanResponderMove(event([[230, 150]]));
  assert.equal(screen.camera().x, before.x - 10);
  find(screen.render(), node => typeof node.props?.onLayout === 'function')
    .onLayout({ nativeEvent: { layout: { width: 500, height: 320 } } });
  assert.deepEqual(screen.camera(), { zoom: 1, x: 0, y: 0 });
  assert.equal(screen.active.at(-1), false);
  screen.unmount();
});

test('toque y lista seleccionan la figura persistida sin activar edición', () => {
  const screen = harness({ width: 100, height: 100, elements: [
    { id: 'shelf', label: 'Entrada', kind: 'rectangle', x: 40, y: 40, width: 20, height: 20, rotation: 0 },
  ] });
  screen.layout();
  screen.controls().onPanResponderGrant(event([[160, 160]]));
  screen.controls().onPanResponderRelease();
  assert.equal(find(screen.render(), node => node.type === Scene).selectedId, 'shelf');
  assert.match(renderToStaticMarkup(screen.render()), /Seleccionado: Entrada/);
  screen.controls().onPanResponderGrant(event([[310, 310]]));
  screen.controls().onPanResponderRelease();
  assert.equal(find(screen.render(), node => node.type === Scene).selectedId, null);
  find(screen.render(), node => node.props?.accessibilityState?.selected === false
    && typeof node.props?.onPress === 'function' && node.props?.children?.props?.children === 'Entrada').onPress();
  assert.equal(find(screen.render(), node => node.type === Scene).selectedId, 'shelf');
  screen.unmount();
});

test('SVG dibuja geometría y símbolos sin atributos nativos inválidos en el DOM', (t) => {
  const errors = [];
  t.mock.method(console, 'error', (...args) => errors.push(args));
  const colors = { navy: '#123' };
  const symbols = load('../src/components/maps/MapScene.js', {
    'react-native-svg': { __esModule: true, default: 'svg',
      G: 'g', Rect: 'rect', Ellipse: 'ellipse', Polygon: 'polygon', Line: 'line', Path: 'path', Text: 'text' },
    '../../theme/colors': { colors },
    '../../utils/mapViewport': model,
  });
  const doc = { width: 100, height: 80, elements: [] };
  const props = { document: doc, viewport: { width: 320, height: 320 }, camera: { zoom: 1, x: 0, y: 0 } };
  assert.equal(Object.hasOwn(symbols.default(props).props, 'accessible'), false,
    'el SVG web no debe recibir accessible={false} de React Native');
  const empty = renderToStaticMarkup(React.createElement(symbols.default, props));
  assert.equal((empty.match(/<rect/g) || []).length, 1, 'solo área, sin figuras de ejemplo');
  for (const kind of Object.keys(model.mapKindLabels)) {
    const element = { id: kind, kind, label: 'Objeto', x: 20, y: 20, width: 30, height: 30, rotation: 45 };
    const html = renderToStaticMarkup(React.createElement(symbols.default, {
      ...props, document: { ...doc, elements: [element] }, selectedId: kind,
    }));
    assert.match(html, /rotate\(45 35 35\) translate\(20 20\)/);
    assert.match(html, /Objeto/);
    assert.match(html, /#006b65/);
    if (kind === 'ellipse') assert.match(html, /<ellipse/);
    if (kind === 'hexagon') assert.match(html, /<polygon/);
    if (kind.includes('door')) assert.match(html, /<path/);
  }
  assert.deepEqual(errors, [], 'el render DOM no debe emitir advertencias de atributos');
});

test('editor arrastra figura en unidades del mapa con zoom sin reiniciar el gesto al renderizar', () => {
  const element = { id: 'rect', kind: 'rectangle', label: 'Rectángulo', x: 40, y: 40,
    width: 20, height: 20, rotation: 0 };
  const moves = [];
  const screen = harness({ width: 100, height: 100, elements: [element] }, {
    mode: 'move', selectedElementId: 'rect',
    onSelectElement: () => {},
    onMoveElement: (id, x, y) => {
      moves.push({ id, x, y });
      screen.props.document = { ...screen.props.document, elements: [{ ...element, x, y }] };
    },
  });
  screen.layout();
  control(screen.render(), 'Acercar mapa').onPress();
  const responder = screen.controls();
  responder.onPanResponderGrant(event([[160, 160]]));
  responder.onPanResponderMove(event([[181.6, 160]]));
  screen.render(); // El documento cambia cada frame del arrastre.
  assert.equal(screen.controls(), responder, 'mantener el mismo PanResponder durante el gesto');
  responder.onPanResponderMove(event([[203.2, 160]]));
  assert.ok(Math.abs(moves[0].x - 45) < 1e-8);
  assert.ok(Math.abs(moves[1].x - 50) < 1e-8, 'delta siempre desde la posición inicial, no acumulado por frame');
  assert.equal(moves[1].id, 'rect');
  assert.equal(screen.camera().x, 0, 'no desplaza la cámara al mover una figura');
  responder.onPanResponderRelease();
  assert.equal(screen.active.at(-1), false);
  screen.unmount();
});

test('pellizcar una figura no la mueve; modo recorrer y guardado deshabilitan edición', () => {
  const doc = { width: 100, height: 100, elements: [
    { id: 'rect', kind: 'rectangle', x: 40, y: 40, width: 20, height: 20, rotation: 0 },
  ] };
  const moves = [];
  const screen = harness(doc, { mode: 'move', onMoveElement: (...args) => moves.push(args) });
  screen.layout();
  screen.controls().onPanResponderGrant(event([[160, 160]]));
  screen.controls().onPanResponderMove(event([[120, 160], [200, 160]]));
  screen.controls().onPanResponderMove(event([[80, 160], [240, 160]]));
  assert.equal(moves.length, 0);
  assert.equal(screen.camera().zoom, 2);
  screen.controls().onPanResponderRelease();
  for (const options of [{ mode: 'pan', disabled: false }, { mode: 'move', disabled: true }]) {
    Object.assign(screen.props, options); screen.render();
    screen.controls().onPanResponderGrant(event([[160, 160]]));
    screen.controls().onPanResponderMove(event([[180, 180]]));
    screen.controls().onPanResponderRelease();
    assert.equal(moves.length, 0);
  }
  screen.unmount();
});
