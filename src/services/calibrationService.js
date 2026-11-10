// Cliente HTTP del contrato de calibración (Fase 4, E1).
// No simula estados ni confirmaciones: cada respuesta se normaliza tal como
// llega. El servidor todavía no implementa estas rutas (etapa E3).
import { apiRequest, ApiError, API_BASE_URL } from './http.js';
import {
  calibrationPaths,
  snapshotPath,
  buildCaptureBody,
  buildCommitBody,
  normalizeSession,
  normalizeSessionSummary,
  normalizeOperationAccepted,
} from '../utils/calibration.js';
import { snapshotTimestamp, snapshotFingerprint } from './deviceAdapter.js';

function invalidRequest(message) {
  const error = new Error(message);
  error.code = 'invalid_request';
  return error;
}

// La clave la genera quien inicia la acción y se conserva al reintentar.
function requireIdempotencyKey(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalidRequest('Falta la clave de idempotencia de la operación.');
  }
  return value;
}

async function post(path, { accessToken, idempotencyKey, body }) {
  return apiRequest(path, {
    method: 'POST',
    accessToken,
    headers: { 'Idempotency-Key': requireIdempotencyKey(idempotencyKey) },
    body,
    timeout: 20000,
  });
}

export const calibrationService = {
  async createSession({ branchId, roiId, accessToken, expectedConfigVersion = null, reason = null, idempotencyKey }) {
    const body = {};
    if (Number.isInteger(expectedConfigVersion) && expectedConfigVersion >= 0) {
      body.expected_config_version = expectedConfigVersion;
    }
    if (typeof reason === 'string' && reason.trim()) body.reason = reason.trim().slice(0, 200);
    const data = await post(calibrationPaths({ branchId, roiId }), { accessToken, idempotencyKey, body });
    return normalizeSession(data);
  },

  async listSessions({ branchId, roiId, accessToken, limit = 20, cursor = null }) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const query = [`limit=${encodeURIComponent(safeLimit)}`];
    if (cursor) query.push(`cursor=${encodeURIComponent(String(cursor))}`);
    const data = await apiRequest(`${calibrationPaths({ branchId, roiId })}?${query.join('&')}`, { accessToken });
    return {
      items: Array.isArray(data?.items) ? data.items.map(normalizeSessionSummary) : [],
      nextCursor: data?.next_cursor ?? null,
    };
  },

  async getSession({ branchId, roiId, calibrationId, accessToken }) {
    if (!calibrationId) throw invalidRequest('Falta la calibración.');
    const data = await apiRequest(calibrationPaths({ branchId, roiId, calibrationId }), { accessToken });
    return normalizeSession(data);
  },

  async capture({ branchId, roiId, calibrationId, kind, captureId, sessionVersion, accessToken, idempotencyKey }) {
    if (!calibrationId) throw invalidRequest('Falta la calibración.');
    const body = buildCaptureBody({ kind, captureId, sessionVersion });
    const data = await post(
      calibrationPaths({ branchId, roiId, calibrationId, action: 'capture' }),
      { accessToken, idempotencyKey, body },
    );
    return normalizeOperationAccepted(data);
  },

  async commit({ branchId, roiId, calibrationId, sessionVersion, references, accessToken, idempotencyKey }) {
    if (!calibrationId) throw invalidRequest('Falta la calibración.');
    const body = buildCommitBody({ sessionVersion, references });
    const data = await post(
      calibrationPaths({ branchId, roiId, calibrationId, action: 'commit' }),
      { accessToken, idempotencyKey, body },
    );
    return normalizeOperationAccepted(data);
  },

  async cancel({ branchId, roiId, calibrationId, sessionVersion, accessToken, idempotencyKey }) {
    if (!calibrationId) throw invalidRequest('Falta la calibración.');
    if (!Number.isInteger(sessionVersion) || sessionVersion < 1) throw invalidRequest('Falta la versión de la sesión.');
    const data = await post(
      calibrationPaths({ branchId, roiId, calibrationId, action: 'cancel' }),
      { accessToken, idempotencyKey, body: { session_version: sessionVersion } },
    );
    return normalizeOperationAccepted(data);
  },

  // Imagen exacta de una referencia o snapshot autorizado, por ID.
  async fetchImage({ branchId, snapshotId, accessToken }) {
    const response = await fetch(`${API_BASE_URL}${snapshotPath({ branchId, snapshotId })}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const error = new ApiError('No se pudo obtener la imagen de referencia.', response.status);
      if (response.status === 404) error.code = 'snapshot_not_found';
      throw error;
    }
    const capturedAt = snapshotTimestamp(response.headers.get('X-Captured-At'));
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
    return {
      uri: `data:image/jpeg;base64,${btoa(binary)}`,
      capturedAt,
      fingerprint: snapshotFingerprint(bytes),
    };
  },
};
