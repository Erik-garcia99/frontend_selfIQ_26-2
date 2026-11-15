import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alertsReducer, alertViews, auditResults, exampleAlerts, exampleEvents, filterError,
  filterEvents, heatLevel, heatmapRows, initialAlertState, initialFilters, timelineEvents,
} from '../src/screens/alerts/alertsModel.js';

const preview = () => alertsReducer(initialAlertState(), { type: 'preview' });
const navigate = (state, view) => alertsReducer(state, { type: 'navigate', view });

test('inventario completo: los 16 frames de Figma sin duplicados', () => {
  assert.equal(Object.keys(alertViews).length, 16);
  assert.deepEqual(Object.values(alertViews).map(([id]) => id),
    Array.from({ length: 16 }, (_, index) => `05.${String(index + 1).padStart(2, '0')}`));
});

test('entrada sin datos ficticios y vista previa explícita', () => {
  const initial = initialAlertState();
  assert.equal(initial.preview, false);
  assert.equal(initial.auditSaved, null);
  assert.equal(initial.orderSaved, null);
  assert.equal(navigate(initial, 'audit'), initial);
  assert.equal(alertsReducer(initial, { type: 'saveAudit' }), initial);
  assert.equal(alertsReducer(initial, { type: 'saveOrder' }), initial);
  assert.equal(preview().preview, true);
});

test('navegación y volver conservan campos; ruta desconocida no rompe la vista', () => {
  let state = navigate(navigate(preview(), 'shelves'), 'stock');
  assert.deepEqual(state.stack, ['summary', 'shelves']);
  assert.equal(navigate(state, 'invented'), state);
  assert.equal(navigate(state, 'stock'), state);
  state = alertsReducer(state, { type: 'back' });
  assert.equal(state.view, 'shelves');
  state = alertsReducer(state, { type: 'back' });
  assert.equal(state.view, 'summary');
  assert.equal(alertsReducer(state, { type: 'back' }), state);
});

test('todos los destinos de tarjetas/eventos/línea de tiempo son válidos', () => {
  for (const item of [...exampleAlerts, ...exampleEvents]) assert.ok(alertViews[item.target], item.target);
  for (const item of timelineEvents) assert.ok(alertViews[item[3]], item[3]);
});

test('volver a una vista existente no crea ciclos ni revive confirmaciones', () => {
  let state = navigate(navigate(navigate(preview(), 'shelves'), 'stock'), 'discrepancy');
  state = navigate(state, 'stock');
  assert.deepEqual(state.stack, ['summary', 'shelves']);
  state = navigate(state, 'summary');
  assert.deepEqual(state.stack, []);
  assert.equal(state.view, 'summary');
});

test('resumen de diseño: ocho alertas, seis nuevas y dos en revisión', () => {
  assert.equal(exampleAlerts.length, 8);
  assert.equal(exampleAlerts.filter(item => item.state === 'Nueva').length, 6);
  assert.equal(exampleAlerts.filter(item => item.state === 'En revisión').length, 2);
  for (const [category, count] of [['Repisas', 2], ['Inventario', 1], ['Ambiente', 2], ['Dispositivos', 3]]) {
    assert.equal(exampleAlerts.filter(item => item.category === category).length, count);
  }
});

test('fechas inválidas, inexistentes e invertidas se rechazan', () => {
  for (const from of ['', '2026-02-30', '2026-13-01', '2026-1-01', 'ayer', '2026-10-23']) {
    assert.ok(filterError({ ...initialFilters, from }), from);
  }
  assert.equal(filterError(initialFilters), '');
});

test('filtros combinan tipo, severidad, estado, producto, ubicación y fecha', () => {
  assert.equal(filterEvents(exampleEvents, initialFilters).length, 5);
  const filters = { ...initialFilters, category: 'Repisas', severity: 'Alta', state: 'Nueva', product: 'Arroz 1 kg', location: 'E-02' };
  assert.deepEqual(filterEvents(exampleEvents, filters).map(item => item.id), ['event-rice']);
  assert.deepEqual(filterEvents(exampleEvents, { ...filters, severity: 'Media' }), []);
  assert.deepEqual(filterEvents(exampleEvents, { ...filters, from: '2026-10-23' }), []);
  assert.deepEqual(filterEvents(exampleEvents, { ...initialFilters, to: '2026-10-21' }), []);
  assert.equal(filterEvents(exampleEvents, { ...initialFilters, category: 'Ambiente' }).length, 1);
});

test('los límites de fechas son inclusivos', () => {
  assert.equal(filterEvents(exampleEvents, { ...initialFilters, from: '2026-10-22', to: '2026-10-22' }).length, 5);
});

test('auditoría exige una causa válida, guarda texto y no modifica inventario', () => {
  let state = navigate(preview(), 'audit');
  for (const result of auditResults) {
    state = alertsReducer(state, { type: 'result', value: result });
    assert.equal(state.result, result);
  }
  assert.equal(alertsReducer(state, { type: 'result', value: 'Robo automático' }), state);
  state = alertsReducer(state, { type: 'notes', value: '  ' });
  assert.equal(alertsReducer(state, { type: 'saveAudit' }), state);
  state = alertsReducer(state, { type: 'notes', value: '  Revisado en almacén.  ' });
  const before = JSON.stringify(exampleAlerts);
  state = alertsReducer(state, { type: 'saveAudit' });
  assert.deepEqual(state.auditSaved, { result: 'Otra causa', notes: 'Revisado en almacén.' });
  assert.equal(state.view, 'auditSaved');
  assert.equal(alertsReducer(state, { type: 'saveAudit' }), state);
  assert.equal(JSON.stringify(exampleAlerts), before);
});

test('observaciones acotadas y cantidad válida entre 1 y 999', () => {
  let state = preview();
  assert.equal(alertsReducer(state, { type: 'notes', value: 'x'.repeat(1500) }).notes.length, 1000);
  for (const [value, expected] of [[0, 1], [-10, 1], [25, 25], [2000, 999]]) {
    state = alertsReducer(state, { type: 'quantity', value });
    assert.equal(state.quantity, expected);
  }
  for (const value of [NaN, Infinity, '24', 1.2]) {
    assert.equal(alertsReducer(state, { type: 'quantity', value }), state);
  }
});

test('confirmación de pedido solo local y manual; doble toque no duplica', () => {
  let state = preview();
  assert.equal(alertsReducer(state, { type: 'saveOrder' }), state);
  state = navigate(state, 'order');
  state = alertsReducer(state, { type: 'quantity', value: 30 });
  state = alertsReducer(state, { type: 'saveOrder' });
  assert.deepEqual(state.orderSaved, { quantity: 30 });
  assert.equal(state.view, 'orderSaved');
  assert.equal(alertsReducer(state, { type: 'saveOrder' }), state);
});

test('salir borra formularios, filtros, navegación y resultados de ejemplo', () => {
  let state = navigate(preview(), 'audit');
  state = alertsReducer(state, { type: 'saveAudit' });
  state = alertsReducer(state, { type: 'filters', value: { category: 'Ambiente' } });
  assert.deepEqual(alertsReducer(state, { type: 'exit' }), initialAlertState());
  const second = initialAlertState();
  second.filters.category = 'Inventario';
  assert.equal(initialAlertState().filters.category, 'Todas');
});

test('mapa de calor: siete días, seis franjas, niveles sin solapamientos', () => {
  assert.equal(heatmapRows.length, 7);
  assert.ok(heatmapRows.every(([, counts]) => counts.length === 6 && counts.every(Number.isInteger)));
  assert.deepEqual([0, 1, 2, 3, 5, 6, 8].map(heatLevel), [0, 1, 1, 2, 2, 3, 3]);
});
