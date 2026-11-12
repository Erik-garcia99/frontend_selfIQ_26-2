import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, nextAction, sessionProgressText } from '../src/utils/calibration.js';

test('un 202 de commit/cancel no muestra éxito y mantiene la consulta', () => {
  for (const state of ['committing', 'cancel_pending']) {
    const session = { state };
    assert.ok(nextAction(session).startsWith('wait_'));
    assert.match(sessionProgressText(session), /Esperando confirmación/);
    assert.doesNotMatch(sessionProgressText(session), /Calibración (guardada|cancelada)\./);
  }
});

test('solo estados terminales detienen la consulta y muestran el resultado', () => {
  for (const state of ['active', 'cancelled', 'failed', 'expired']) {
    assert.ok(!nextAction({ state }).startsWith('wait_'));
    assert.ok(sessionProgressText({ state }));
  }
  assert.equal(sessionProgressText({ state: 'active' }), 'Calibración guardada.');
  assert.match(sessionProgressText({ state: 'cancelled' }), /Ya puedes editar/);
  assert.match(sessionProgressText({ state: 'failed' }), /falló/);
});

test('cancelación rechazada o vencida no se confunde con confirmación del nodo', () => {
  assert.equal(canTransition('cancel_pending', 'failed'), true);
  assert.equal(canTransition('cancel_pending', 'expired'), true);
});

test('guardar descriptor no detiene consulta si falta el JPEG revisable', () => {
  assert.equal(nextAction({ state: 'empty_ready', references: [
    { kind: 'empty', status: 'image_pending' },
  ] }), 'wait_capture');
  assert.equal(nextAction({ state: 'pair_ready', references: [
    { kind: 'empty', status: 'ready' }, { kind: 'full', status: 'image_pending' },
  ] }), 'wait_capture');
});
