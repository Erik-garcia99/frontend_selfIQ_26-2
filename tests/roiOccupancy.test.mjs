import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  normalizeRoiOccupancy, roiOccupancyPresentation, createRoiOccupancyPoller,
} from '../src/utils/roiOccupancy.js';

const scope = { branchId: 'branch-1', roiId: 'roi-1' };
const reading = (extra = {}) => ({
  branch_id: scope.branchId, roi_id: scope.roiId, occupancy_pct: 55,
  config_version: 31, calibration_version: 2,
  received_at: '2026-11-16T21:57:00.355029Z', age_seconds: 14,
  stale_after_seconds: 60, status: 'ok', clock_quality: 'gateway_received', ...extra,
});
const presentation = (data, now = 1000) => roiOccupancyPresentation({
  reading: data, loading: false, error: '', fetchedAt: 1000,
}, now);

test('0 y 100 son porcentajes válidos, distintos de ausencia', () => {
  for (const value of [0, 100]) {
    const data = normalizeRoiOccupancy(reading({ occupancy_pct: value }), scope);
    assert.equal(presentation(data).label, `${value} %`);
  }
});

test('no_data nunca inventa cero aunque tenga versiones conocidas', () => {
  const data = normalizeRoiOccupancy(reading({
    status: 'no_data', occupancy_pct: null, received_at: null, age_seconds: null,
  }), scope);
  assert.equal(presentation(data).label, '—');
  assert.equal(presentation(data).status, 'Sin datos');
  assert.throws(() => normalizeRoiOccupancy({ ...data, occupancy_pct: 0 }, scope));
});

test('rechaza identidades, porcentajes, versiones y tiempos incompatibles', () => {
  for (const extra of [
    { branch_id: 'otra' }, { roi_id: 'otra' }, { status: 'unknown' },
    ...[null, '55', true, -1, 101, 1.5, NaN].map(occupancy_pct => ({ occupancy_pct })),
    { config_version: 0 }, { calibration_version: true }, { received_at: 'invalid' },
    { age_seconds: -1 }, { age_seconds: null }, { stale_after_seconds: 0 },
    { clock_quality: 'capture_utc' },
  ]) {
    assert.throws(() => normalizeRoiOccupancy(reading(extra), scope));
  }
});

test('stale conserva el último valor y no lo presenta como reciente', () => {
  const view = presentation(reading({ status: 'stale', age_seconds: 124 }));
  assert.equal(view.label, '55 %');
  assert.equal(view.status, 'Sin actualizar');
  assert.equal(view.outdated, true);
});

test('envejece desde age_seconds del servidor incluso sin otra respuesta HTTP', () => {
  assert.equal(presentation(reading(), 46000).outdated, false); // age 59
  assert.equal(presentation(reading(), 47000).outdated, true); // age 60
  assert.equal(presentation(reading(), -10000).outdated, false); // phone clock moved back
});

test('carga y error no se convierten en 0 ni conservan un valor como vigente', () => {
  assert.equal(roiOccupancyPresentation({ loading: true }).status, 'Cargando…');
  const view = roiOccupancyPresentation({ reading: reading(), error: 'Sin conexión' });
  assert.equal(view.label, '—');
  assert.equal(view.status, 'No se pudo consultar');
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

function harness(load) {
  let id = 0;
  const timers = new Map();
  const updates = [];
  const poller = createRoiOccupancyPoller({
    load, onChange: state => updates.push(state), now: () => 1000,
    setTimer: (fn, ms) => { timers.set(++id, { fn, ms }); return id; },
    clearTimer: timer => timers.delete(timer),
  });
  return { poller, timers, updates };
}

test('consulta cada 10 s sin solapar solicitudes y limita toques repetidos', async () => {
  const first = deferred(), second = deferred();
  let calls = 0;
  const h = harness(() => (++calls === 1 ? first.promise : second.promise));
  h.poller.setActive(true);
  h.poller.refresh(); h.poller.refresh();
  assert.equal(calls, 1);
  first.resolve(reading());
  await flush();
  assert.equal(calls, 2);
  assert.equal(h.timers.size, 0);
  second.resolve(reading({ occupancy_pct: 56 }));
  await flush();
  assert.equal(h.timers.size, 1);
  assert.equal([...h.timers.values()][0].ms, 10000);
  assert.equal(h.updates.at(-1).reading.occupancy_pct, 56);
  h.poller.stop();
});

test('segundo plano cancela timer y reanudar consulta inmediatamente', async () => {
  let calls = 0;
  const h = harness(async () => { calls++; return reading(); });
  h.poller.setActive(true);
  await flush();
  h.poller.setActive(false);
  assert.equal(h.timers.size, 0);
  h.poller.refresh();
  assert.equal(calls, 1);
  h.poller.setActive(true);
  await flush();
  assert.equal(calls, 2);
  h.poller.stop();
});

test('ignora respuesta que cruza pausa/reanudación y pide una nueva sin solape', async () => {
  const old = deferred(), current = deferred();
  let calls = 0;
  const h = harness(() => (++calls === 1 ? old.promise : current.promise));
  h.poller.setActive(true);
  h.poller.setActive(false);
  h.poller.setActive(true);
  assert.equal(calls, 1);
  old.resolve(reading({ occupancy_pct: 100 }));
  await flush();
  assert.equal(calls, 2);
  assert.equal(h.updates.some(state => state.reading?.occupancy_pct === 100), false);
  current.resolve(reading({ occupancy_pct: 53 }));
  await flush();
  assert.equal(h.updates.at(-1).reading.occupancy_pct, 53);
  h.poller.stop();
});

test('desmontar/cambiar contexto descarta respuestas tardías', async () => {
  const old = deferred();
  const h = harness(() => old.promise);
  h.poller.setActive(true);
  h.poller.stop();
  const count = h.updates.length;
  old.resolve(reading());
  await flush();
  assert.equal(h.updates.length, count);
  assert.equal(h.timers.size, 0);
});

test('dos ROI mantienen lecturas y errores independientes, con recuperación', async () => {
  const a = harness(async () => reading());
  let fail = true;
  const b = harness(async () => {
    if (fail) throw Object.assign(new Error('not found'), { status: 404 });
    return reading({ roi_id: 'roi-2', occupancy_pct: 0 });
  });
  a.poller.setActive(true); b.poller.setActive(true);
  await flush();
  assert.equal(a.updates.at(-1).reading.occupancy_pct, 55);
  assert.equal(b.updates.at(-1).reading, null);
  assert.match(b.updates.at(-1).error, /ya no está disponible/);
  fail = false; b.poller.refresh();
  await flush();
  assert.equal(b.updates.at(-1).reading.occupancy_pct, 0);
  assert.equal(b.updates.at(-1).error, '');
  assert.equal(a.updates.at(-1).reading.occupancy_pct, 55);
  a.poller.stop(); b.poller.stop();
});

test('invalidación elimina la lectura anterior y una calibración nueva puede recuperarse', async () => {
  let data = reading();
  const h = harness(async () => data);
  h.poller.setActive(true);
  await flush();
  data = reading({ status: 'no_data', occupancy_pct: null, received_at: null, age_seconds: null, calibration_version: 3 });
  h.poller.refresh();
  await flush();
  assert.equal(presentation(h.updates.at(-1).reading).label, '—');
  data = reading({ occupancy_pct: 100, calibration_version: 3 });
  h.poller.refresh();
  await flush();
  assert.equal(h.updates.at(-1).reading.calibration_version, 3);
  assert.equal(presentation(h.updates.at(-1).reading).label, '100 %');
  h.poller.stop();
});

test('stale vuelve a ok únicamente después de una respuesta nueva válida', async () => {
  let data = reading({ status: 'stale', age_seconds: 124 });
  const h = harness(async () => data);
  h.poller.setActive(true);
  await flush();
  assert.equal(presentation(h.updates.at(-1).reading).outdated, true);
  data = reading({ occupancy_pct: 53, age_seconds: 8 });
  h.poller.refresh();
  await flush();
  assert.equal(presentation(h.updates.at(-1).reading).outdated, false);
  assert.equal(h.updates.at(-1).reading.occupancy_pct, 53);
  h.poller.stop();
});

test('servicio usa GET autenticado por sucursal/ROI, sin disparar comandos', async t => {
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example';
  const { getLatestRoiOccupancy } = await import('../src/services/telemetryService.js');
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(reading()), { status: 200 });
  };
  assert.equal((await getLatestRoiOccupancy({ ...scope, accessToken: 'test-only' })).occupancy_pct, 55);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.example/branches/branch-1/rois/roi-1/occupancy/latest');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-only');
  assert.ok(!calls[0].options.method || calls[0].options.method === 'GET');
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Forbidden' }), { status: 403 });
  await assert.rejects(getLatestRoiOccupancy({ ...scope, accessToken: 'test-only' }), { status: 403 });
  globalThis.fetch = async () => new Response(JSON.stringify(reading({ roi_id: 'otra-zona' })), { status: 200 });
  await assert.rejects(getLatestRoiOccupancy({ ...scope, accessToken: 'test-only' }), /inválida/);
});

test('detalle monta la vista por cámara/repisa; hook limpia suscripciones y timers', () => {
  const screen = readFileSync(new URL('../src/screens/devices/CameraDetailScreen.js', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../src/screens/devices/RoiOccupancyPanel.js', import.meta.url), 'utf8');
  const hook = readFileSync(new URL('../src/utils/useRoiOccupancy.js', import.meta.url), 'utf8');
  assert.match(screen, /<RoiOccupancyPanel key=.*deviceId.*shelf\.id/);
  assert.match(panel, /roiId: roi\.id/);
  assert.match(panel, /No es conteo de productos ni inventario POS/);
  assert.match(hook, /current\.stop\(\)/);
  assert.match(hook, /subscription\.remove\(\)/);
  assert.match(hook, /clearInterval\(clock\)/);
  assert.doesNotMatch(panel, /requestSnapshot|calibrationService|\.capture\(|\.commit\(/);
});
