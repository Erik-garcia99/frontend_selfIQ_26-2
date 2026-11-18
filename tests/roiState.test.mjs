import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeShelfStates } from '../src/services/roiStateService.js';

const B = '11111111-1111-4111-8111-111111111111';
const item = status => ({ branch_id: B, roi_id: 'zone', status, quality: 'ok', occupancy_pct: 18 });

test('acepta estados confirmados y calidad conocida', () => {
  const result = normalizeShelfStates([item('low'), { ...item('adequate'), quality: 'camera_moved' }], B);
  assert.equal(result.length, 2);
  assert.equal(result[0].status, 'low');
});

test('rechaza sucursal ajena, estado inventado y porcentaje no entero', () => {
  assert.throws(() => normalizeShelfStates([{ ...item('low'), branch_id: 'otra' }], B));
  assert.throws(() => normalizeShelfStates([item('agotado')], B));
  assert.throws(() => normalizeShelfStates([{ ...item('low'), occupancy_pct: 18.5 }], B));
  assert.throws(() => normalizeShelfStates({}, B));
});

test('sin lectura conserva porcentaje nulo', () => {
  const result = normalizeShelfStates([{ ...item('unknown'), occupancy_pct: null, quality: 'no_data' }], B);
  assert.equal(result[0].occupancy_pct, null);
});
