import assert from 'node:assert/strict';
import test from 'node:test';
import { pollAlerts } from '../src/screens/alerts/alertsPolling.js';

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

test('polling serializado, sin respuestas ni timers después de desmontar/cambiar sucursal', async () => {
  let finish;
  let requests = 0;
  const data = [], timers = [], busy = [];
  const stop = pollAlerts({
    load: () => { requests++; return new Promise(resolve => { finish = resolve; }); },
    onData: value => data.push(value), onError: assert.fail, onBusy: value => busy.push(value),
    schedule: fn => timers.push(fn), cancel: () => {},
  });
  await flush();
  assert.equal(requests, 1);
  assert.equal(timers.length, 0);
  stop();
  finish({ branch: 'old' });
  await flush();
  assert.deepEqual(data, []);
  assert.deepEqual(busy, [true]);
  assert.equal(timers.length, 0);
});

test('polling reintenta un error sin fabricar un resultado vacío', async () => {
  const values = [], errors = [], timers = [];
  let fail = true;
  const stop = pollAlerts({
    load: async () => { if (fail) throw new Error('offline'); return { items: ['real'] }; },
    onData: value => values.push(value), onError: error => errors.push(error.message),
    onBusy: () => {}, schedule: fn => timers.push(fn), cancel: () => {},
  });
  await flush();
  assert.deepEqual(values, []);
  assert.deepEqual(errors, ['offline']);
  fail = false;
  await timers.shift()();
  assert.deepEqual(values, [{ items: ['real'] }]);
  stop();
});

test('el intervalo por defecto es el reducido de 3 s (P-04)', async () => {
  const delays = [];
  const stop = pollAlerts({
    load: async () => ({}), onData: () => {}, onError: assert.fail, onBusy: () => {},
    schedule: (_fn, delay) => { delays.push(delay); }, cancel: () => {},
  });
  await flush();
  stop();
  assert.deepEqual(delays, [3000]);
});

test('cancelar antes del primer request no toca la sesión anterior', async () => {
  let called = false;
  const stop = pollAlerts({
    load: () => { called = true; }, onData: assert.fail, onError: assert.fail, onBusy: assert.fail,
  });
  stop();
  await flush();
  assert.equal(called, false);
});
