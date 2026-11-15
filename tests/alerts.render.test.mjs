// Renderiza los componentes reales con react-native-web, sin instalar paquetes
// ni montar un backend. Babel ya es dependencia de Expo.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { alertViews, alertsReducer, initialAlertState } from '../src/screens/alerts/alertsModel.js';

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
  mod.require = (id) => {
    if (id === 'react-native') return require('react-native-web');
    if (!id.startsWith('.')) return require(id);
    let path = resolve(dirname(filename), id);
    if (!extname(path)) path += '.js';
    if (path.endsWith('/context/DeviceContext.js')) return { useDevices: () => ({ branchId: 'test-branch' }) };
    if (path.endsWith('/context/AuthContext.js')) return { useAuth: () => ({}) };
    if (/\.(png|jpg|jpeg)$/.test(path)) return { uri: 'test-asset.png', width: 24, height: 24 };
    return loadSource(path);
  };
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

const { AlertsWorkspace } = loadSource(fileURLToPath(new URL('../src/screens/alerts/AlertsScreen.js', import.meta.url)));
const render = state => renderToStaticMarkup(React.createElement(AlertsWorkspace, { initialState: state, go: () => {} }));

test('entrada real no muestra conteos ni confirmaciones ficticias', () => {
  const html = render(initialAlertState());
  assert.ok(html.includes('Monitoreo de alertas pendiente de conexión'));
  assert.ok(html.includes('Ver diseño con datos de ejemplo'));
  assert.equal(html.includes('8 alertas abiertas'), false);
  assert.equal(html.includes('24 unidades'), false);
});

for (const [view, [frame, title]] of Object.entries(alertViews)) {
  test(`${frame} renderiza ${title} con navegación y aviso de ejemplo`, () => {
    const state = alertsReducer(initialAlertState(), { type: 'preview' });
    const html = render({ ...state, view, stack: view === 'summary' ? [] : ['summary'] });
    assert.ok(html.includes(title), view);
    assert.ok(html.includes('Vista previa · Datos de ejemplo'), view);
    assert.ok(html.includes('Salir de la vista previa'), view);
    for (const tab of ['Inicio', 'Panel', 'Alertas', 'Ajustes']) assert.ok(html.includes(tab), tab);
  });
}

test('el frame de auditoría conserva edición y opciones accesibles', () => {
  const html = render({ ...initialAlertState(), preview: true, view: 'audit', stack: ['summary'] });
  assert.ok(html.includes('radiogroup'));
  assert.ok(html.includes('Observaciones de la revisión'));
  assert.ok(html.includes('Guardar resultado de ejemplo'));
});

test('un periodo sin eventos muestra vacío, no un historial inventado', () => {
  const state = initialAlertState();
  const html = render({ ...state, preview: true, view: 'history', filters: { ...state.filters, to: '2026-10-21' } });
  assert.ok(html.includes('Sin eventos de ejemplo para este filtro'));
});

const { LiveAlertsView } = loadSource(fileURLToPath(new URL('../src/screens/alerts/LiveAlertsScreen.js', import.meta.url)));
const live = (props = {}) => renderToStaticMarkup(React.createElement(LiveAlertsView, {
  branchId: 'test-branch', filters: { status: 'active', alert_type: '', offset: 0 },
  go: () => {}, ...props,
}));

test('bandeja de producción distingue carga, error, sin sucursal y vacío', () => {
  assert.ok(live().includes('Cargando alertas'));
  assert.ok(live({ branchId: '' }).includes('Selecciona una sucursal'));
  assert.ok(live({ error: 'Error de permisos' }).includes('Error de permisos'));
  const html = live({ result: { items: [], sources: {} } });
  assert.ok(html.includes('Sin alertas registradas para este filtro'));
  assert.ok(html.includes('generación de alertas pendiente'));
  assert.ok(html.includes('El monitor aún no confirmó ninguna evaluación'));
  for (const excluded of ['Mapa de calor', 'Pedido sugerido', 'Ver diseño con datos de ejemplo', '8 alertas abiertas']) {
    assert.equal(html.includes(excluded), false, excluded);
  }
});

test('bandeja renderiza filas persistidas sin inventar ocupación ni stock', () => {
  const html = live({ result: { items: [{
    id: 'event-1', alert_type: 'node_offline', severity: 'warning', status: 'open',
    message: 'No llegó presencia', triggered_at: '2026-11-14T10:00:00Z', node_id: 'node-1',
    metadata: { node_name: 'Nodo registrado' },
  }] } });
  assert.ok(html.includes('No llegó presencia'));
  assert.ok(html.includes('Reconocer alerta'));
  assert.ok(html.includes('Nodo registrado'));
  assert.equal(html.includes('Ocupación visual'), false);
  assert.equal(html.includes('24 unidades'), false);
});

test('ubicaciones son lista de configuración, no plano ni prueba de conexión', () => {
  const html = live({ locationsVisible: true, result: { items: [], locations: [{
    id: 'shelf-1', name: 'Estante A', location: 'Entrada', lights: [
      { node_id: 'guide-1', node_name: 'Guía real', channel: 0, name: 'Luz A' },
    ],
  }] } });
  for (const text of ['Estante A', 'Entrada', 'Guía real', 'Luz A']) assert.ok(html.includes(text), text);
  assert.equal(html.includes('Mapa del local'), false);
});

test('monitor fallido no se presenta como evaluación normal', () => {
  const html = live({ result: { items: [], monitor: { error: true } } });
  assert.ok(html.includes('El monitor falló'));
});
