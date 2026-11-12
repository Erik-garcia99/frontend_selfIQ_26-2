import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OPEN_STATES,
  TERMINAL_STATES,
  canTransition,
  nextAction,
  kindLabel,
  sessionStateLabel,
  zoneCalibrationLabel,
  calibrationPaths,
  snapshotPath,
  buildCaptureBody,
  buildCommitBody,
  normalizeSession,
  normalizeSessionSummary,
  normalizeOperationAccepted,
  calibrationErrorText,
  newClientId,
} from '../src/utils/calibration.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('transiciones válidas del contrato', () => {
  assert.equal(canTransition('draft', 'empty_ready'), true);
  assert.equal(canTransition('empty_ready', 'pair_ready'), true);
  assert.equal(canTransition('pair_ready', 'committing'), true);
  assert.equal(canTransition('committing', 'active'), true);
  assert.equal(canTransition('committing', 'pair_ready'), true);
  assert.equal(canTransition('cancel_pending', 'cancelled'), true);
});

test('cancelar durante committing requiere consultar primero', () => {
  assert.equal(canTransition('committing', 'cancelled'), false);
  assert.equal(canTransition('committing', 'cancel_pending'), false);
});

test('no se salta la referencia vacía ni se revive una sesión terminal', () => {
  assert.equal(canTransition('draft', 'pair_ready'), false);
  assert.equal(canTransition('empty_ready', 'committing'), false);
  for (const state of TERMINAL_STATES) {
    for (const target of ['draft', 'empty_ready', 'pair_ready', 'committing']) {
      assert.equal(canTransition(state, target), false, `${state} no debe volver a ${target}`);
    }
  }
});

test('open/terminal no se solapan', () => {
  for (const state of TERMINAL_STATES) assert.equal(OPEN_STATES.includes(state), false);
});

test('vocabulario de interfaz', () => {
  assert.equal(kindLabel('empty'), 'Zona vacía');
  assert.equal(kindLabel('full'), 'Zona abastecida');
  assert.equal(zoneCalibrationLabel('uncalibrated'), 'Sin calibrar');
  assert.equal(zoneCalibrationLabel('calibrated'), 'Calibrada');
  assert.equal(zoneCalibrationLabel('needs_recalibration'), 'Necesita recalibrarse');
  assert.equal(sessionStateLabel('active'), 'Calibración guardada');
});

test('siguiente acción según estado y referencias', () => {
  assert.equal(nextAction(null), 'start');
  assert.equal(nextAction({ state: 'draft', references: [] }), 'capture_empty');
  assert.equal(nextAction({ state: 'draft', references: [{ kind: 'empty', status: 'pending' }] }), 'wait_capture');
  assert.equal(nextAction({ state: 'empty_ready', references: [{ kind: 'empty', status: 'ready' }] }), 'capture_full');
  assert.equal(nextAction({
    state: 'pair_ready',
    references: [{ kind: 'empty', status: 'ready' }, { kind: 'full', status: 'ready' }],
  }), 'review_commit');
  assert.equal(nextAction({
    state: 'pair_ready',
    references: [{ kind: 'empty', status: 'ready' }, { kind: 'full', status: 'image_pending' }],
  }), 'wait_capture');
  assert.equal(nextAction({ state: 'committing' }), 'wait_confirm');
  assert.equal(nextAction({ state: 'active' }), 'done');
  assert.equal(nextAction({ state: 'failed' }), 'closed');
});

test('la última captura del mismo tipo manda al recapturar', () => {
  assert.equal(nextAction({
    state: 'empty_ready',
    references: [
      { kind: 'full', status: 'failed' },
      { kind: 'full', status: 'pending' },
    ],
  }), 'wait_capture');
});

test('rutas codificadas y sin barra final', () => {
  assert.equal(
    calibrationPaths({ branchId: 'b 1', roiId: 'r/1' }),
    '/branches/b%201/rois/r%2F1/calibrations',
  );
  assert.equal(
    calibrationPaths({ branchId: 'b', roiId: 'r', calibrationId: 'c 2', action: 'capture' }),
    '/branches/b/rois/r/calibrations/c%202/capture',
  );
  assert.equal(snapshotPath({ branchId: 'b', snapshotId: 's/1' }), '/branches/b/snapshots/s%2F1');
  assert.throws(() => calibrationPaths({ roiId: 'r' }), /sucursal/);
  assert.throws(() => calibrationPaths({ branchId: 'b' }), /zona/);
});

test('cuerpos de captura y confirmación', () => {
  assert.deepEqual(
    buildCaptureBody({ kind: 'empty', captureId: 'cap-1', sessionVersion: 3 }),
    { kind: 'empty', capture_id: 'cap-1', session_version: 3 },
  );
  assert.throws(() => buildCaptureBody({ kind: 'lleno', captureId: 'cap', sessionVersion: 1 }), /vacía o abastecida/);
  assert.throws(() => buildCaptureBody({ kind: 'empty', captureId: '', sessionVersion: 1 }), /identificador/);
  assert.throws(() => buildCaptureBody({ kind: 'empty', captureId: 'cap', sessionVersion: 0 }), /versión/);

  assert.deepEqual(
    buildCommitBody({ sessionVersion: 4, references: { empty: { captureId: 'a' }, full: { captureId: 'b' } } }),
    { session_version: 4, references: { empty: { capture_id: 'a' }, full: { capture_id: 'b' } } },
  );
  assert.throws(() => buildCommitBody({
    sessionVersion: 4,
    references: { empty: { captureId: 'a' }, full: { captureId: 'a' } },
  }), /distintas/);
  assert.throws(() => buildCommitBody({ sessionVersion: 4, references: { empty: { captureId: 'a' } } }), /abastecida/);
});

test('normalización de la sesión', () => {
  const session = normalizeSession({
    id: 'cal-1',
    roi_id: 'roi-1',
    state: 'pair_ready',
    session_version: 5,
    calibration_version: 12,
    config_version: 7,
    context_hash: 'f'.repeat(64),
    product: { id: 'p-1', sku: 'AGUA-600', name: 'Agua 600 ml' },
    active: { calibration_version: 11, confirmed_at: '2026-10-30T16:20:00.000Z', context_valid: false },
    references: [{ capture_id: 'cap-1', kind: 'empty', status: 'ready', descriptor_crc: 'deadbeef' }],
    operations: [{ operation_id: 'op-1', action: 'capture', status: 'applied', attempts: 1 }],
    created_at: '2026-11-08T18:02:11.000Z',
  });
  assert.equal(session.sessionVersion, 5);
  assert.equal(session.product.sku, 'AGUA-600');
  assert.equal(session.active.contextValid, false);
  assert.equal(session.references[0].captureId, 'cap-1');
  assert.equal(session.references[0].descriptorCrc, 'deadbeef');
  assert.equal(session.operations[0].operationId, 'op-1');
  assert.equal(normalizeSession({}).state, 'draft');

  const summary = normalizeSessionSummary({ id: 'cal-2', state: 'active', calibration_version: 11, context_valid: true });
  assert.equal(summary.id, 'cal-2');
  assert.equal(summary.contextValid, true);
  assert.equal(normalizeSessionSummary({ context_valid: false }).contextValid, false);

  const accepted = normalizeOperationAccepted({
    operation_id: 'op-2', session_version: 2, state: 'draft',
    capture: { capture_id: 'cap-2', kind: 'empty', status: 'pending' },
  });
  assert.equal(accepted.operationId, 'op-2');
  assert.equal(accepted.capture.status, 'pending');
});

test('mensajes de error estables y por estado HTTP', () => {
  assert.match(calibrationErrorText({ code: 'busy', status: 409 }), /ocupada/);
  assert.match(calibrationErrorText({ code: 'context_mismatch', status: 409 }), /cambiaron/);
  assert.match(calibrationErrorText({ status: 403 }), /permiso/);
  assert.match(calibrationErrorText({ status: 0 }), /conexión/);
  assert.match(calibrationErrorText({ status: 504 }), /no está disponible|no respondió/);
  assert.match(calibrationErrorText({ status: 422 }), /No pudimos completar/);
});

test('identificadores de cliente con formato UUID v4 y únicos en la práctica', () => {
  const values = new Set();
  for (let index = 0; index < 500; index += 1) {
    const value = newClientId();
    assert.match(value, UUID_V4);
    values.add(value);
  }
  assert.equal(values.size, 500);
});

// --- Contrato HTTP con fetch simulado -------------------------------------

process.env.EXPO_PUBLIC_API_URL = 'https://api.test';
const { calibrationService } = await import('../src/services/calibrationService.js');

function stubFetch({ status = 200, body = {} } = {}) {
  const calls = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { calls, restore: () => { globalThis.fetch = previous; } };
}

test('crear sesión envía contexto, token e Idempotency-Key', async () => {
  const stub = stubFetch({
    body: { id: 'cal-1', roi_id: 'roi-1', state: 'draft', session_version: 1, calibration_version: 12, product: { id: 'p', sku: 'S', name: 'N' } },
  });
  try {
    const session = await calibrationService.createSession({
      branchId: 'b1', roiId: 'r1', accessToken: 'token',
      expectedConfigVersion: 7, reason: 'Primera calibración', idempotencyKey: 'key-1',
    });
    assert.equal(stub.calls.length, 1);
    const { url, options } = stub.calls[0];
    assert.equal(url, 'https://api.test/branches/b1/rois/r1/calibrations');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer token');
    assert.equal(options.headers['Idempotency-Key'], 'key-1');
    assert.deepEqual(JSON.parse(options.body), { expected_config_version: 7, reason: 'Primera calibración' });
    assert.equal(session.state, 'draft');
  } finally {
    stub.restore();
  }
});

test('captura: ruta, cuerpo y respuesta aceptada', async () => {
  const stub = stubFetch({
    status: 202,
    body: { operation_id: 'op-1', session_version: 2, state: 'draft', capture: { capture_id: 'cap-1', kind: 'empty', status: 'pending' } },
  });
  try {
    const accepted = await calibrationService.capture({
      branchId: 'b1', roiId: 'r1', calibrationId: 'cal-1', kind: 'empty',
      captureId: 'cap-1', sessionVersion: 1, accessToken: 'token', idempotencyKey: 'key-2',
    });
    const { url, options } = stub.calls[0];
    assert.equal(url, 'https://api.test/branches/b1/rois/r1/calibrations/cal-1/capture');
    assert.deepEqual(JSON.parse(options.body), { kind: 'empty', capture_id: 'cap-1', session_version: 1 });
    assert.equal(accepted.operationId, 'op-1');
    assert.equal(accepted.capture.captureId, 'cap-1');
  } finally {
    stub.restore();
  }
});

test('commit y cancel respetan el contrato y no salen sin clave', async () => {
  const stub = stubFetch({ status: 202, body: { operation_id: 'op-2', session_version: 5, state: 'committing' } });
  try {
    await calibrationService.commit({
      branchId: 'b1', roiId: 'r1', calibrationId: 'cal-1', sessionVersion: 4,
      references: { empty: { captureId: 'a' }, full: { captureId: 'b' } },
      accessToken: 'token', idempotencyKey: 'key-3',
    });
    assert.equal(stub.calls[0].url, 'https://api.test/branches/b1/rois/r1/calibrations/cal-1/commit');
    assert.deepEqual(JSON.parse(stub.calls[0].options.body), {
      session_version: 4,
      references: { empty: { capture_id: 'a' }, full: { capture_id: 'b' } },
    });

    await calibrationService.cancel({
      branchId: 'b1', roiId: 'r1', calibrationId: 'cal-1', sessionVersion: 5,
      accessToken: 'token', idempotencyKey: 'key-4',
    });
    assert.deepEqual(JSON.parse(stub.calls[1].options.body), { session_version: 5 });

    await assert.rejects(calibrationService.cancel({
      branchId: 'b1', roiId: 'r1', calibrationId: 'cal-1', sessionVersion: 5, accessToken: 'token',
    }), /idempotencia/);
    assert.equal(stub.calls.length, 2);
  } finally {
    stub.restore();
  }
});

test('listado y detalle normalizan sin inventar datos', async () => {
  const stub = stubFetch({
    body: { items: [{ id: 'cal-1', state: 'active', calibration_version: 11 }], next_cursor: null },
  });
  try {
    const page = await calibrationService.listSessions({ branchId: 'b1', roiId: 'r1', accessToken: 'token', limit: 500 });
    assert.equal(stub.calls[0].url, 'https://api.test/branches/b1/rois/r1/calibrations?limit=50');
    assert.equal(page.items[0].calibrationVersion, 11);
    assert.equal(page.nextCursor, null);
  } finally {
    stub.restore();
  }

  const detail = stubFetch({ body: { id: 'cal-1', state: 'empty_ready', session_version: 2 } });
  try {
    const session = await calibrationService.getSession({ branchId: 'b1', roiId: 'r1', calibrationId: 'cal-1', accessToken: 'token' });
    assert.equal(detail.calls[0].url, 'https://api.test/branches/b1/rois/r1/calibrations/cal-1');
    assert.equal(session.state, 'empty_ready');
  } finally {
    detail.restore();
  }
});

test('un 409 del backend conserva código y mensaje accionable', async () => {
  const stub = stubFetch({ status: 409, body: { code: 'busy', detail: 'Otra calibración en curso', request_id: 'req-1' } });
  try {
    await assert.rejects(
      calibrationService.createSession({ branchId: 'b1', roiId: 'r1', accessToken: 'token', idempotencyKey: 'key-5' }),
      (error) => {
        assert.equal(error.status, 409);
        assert.equal(error.code, 'busy');
        assert.equal(error.requestId, 'req-1');
        assert.match(calibrationErrorText(error), /ocupada/);
        return true;
      },
    );
  } finally {
    stub.restore();
  }
});
