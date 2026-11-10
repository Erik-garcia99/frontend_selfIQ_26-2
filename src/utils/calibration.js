// Contrato móvil de calibración (Fase 4, E1).
// Reglas puras y serialización de peticiones. Sin React ni red: se prueba con
// `node --test tests/calibration.contract.test.mjs`.
// Fuente única del contrato: docs/PLAN_FASE_4_CALIBRACION.md (Anexo A)

export const CALIBRATION_STATES = [
  'draft', 'empty_ready', 'pair_ready', 'committing',
  'active', 'cancel_pending', 'cancelled', 'expired', 'failed',
];

export const OPEN_STATES = ['draft', 'empty_ready', 'pair_ready', 'committing', 'cancel_pending'];

export const TERMINAL_STATES = ['active', 'cancelled', 'expired', 'failed'];

// Transiciones permitidas entre estados distintos. Recapturar una referencia
// no cambia el estado de la sesión y por eso no aparece aquí.
export const SESSION_TRANSITIONS = {
  draft: ['empty_ready', 'cancelled', 'expired', 'failed'],
  empty_ready: ['pair_ready', 'cancelled', 'expired', 'failed'],
  pair_ready: ['committing', 'cancelled', 'expired', 'failed'],
  committing: ['active', 'pair_ready', 'failed'],
  active: [],
  cancel_pending: ['cancelled', 'active'],
  cancelled: [],
  expired: [],
  failed: [],
};

export function canTransition(from, to) {
  return Boolean(SESSION_TRANSITIONS[from]?.includes(to));
}

export const CAPTURE_KINDS = ['empty', 'full'];

export const CAPTURE_STATUSES = ['pending', 'stored', 'image_pending', 'ready', 'failed', 'unknown'];

export const KIND_LABELS = { empty: 'Zona vacía', full: 'Zona abastecida' };

export function kindLabel(kind) {
  return KIND_LABELS[kind] || 'Referencia';
}

const STATE_LABELS = {
  draft: 'Preparando',
  empty_ready: 'Falta la zona abastecida',
  pair_ready: 'Lista para revisar',
  committing: 'Confirmando con la cámara',
  active: 'Calibración guardada',
  cancel_pending: 'Cancelando',
  cancelled: 'Cancelada',
  expired: 'Caducada',
  failed: 'No se pudo completar',
};

export function sessionStateLabel(state) {
  return STATE_LABELS[state] || 'Sin información';
}

const ZONE_STATUS_LABELS = {
  uncalibrated: 'Sin calibrar',
  calibrated: 'Calibrada',
  needs_recalibration: 'Necesita recalibrarse',
};

export function zoneCalibrationLabel(status) {
  return ZONE_STATUS_LABELS[status] || 'Sin calibrar';
}

// Siguiente acción del asistente según el estado de la sesión y de sus
// referencias. Nunca inventa progreso: una referencia `pending` sigue siendo
// "esperar", no "capturada".
export function nextAction(session) {
  if (!session?.state) return 'start';
  const references = Array.isArray(session.references) ? session.references : [];
  const lastOf = (kind) => references.filter((reference) => reference.kind === kind).slice(-1)[0] || null;
  const pending = (reference) => Boolean(reference) && ['pending', 'stored', 'image_pending'].includes(reference.status);
  const ready = (reference) => reference?.status === 'ready';

  switch (session.state) {
    case 'draft':
      return pending(lastOf('empty')) ? 'wait_capture' : 'capture_empty';
    case 'empty_ready':
      return pending(lastOf('full')) ? 'wait_capture' : 'capture_full';
    case 'pair_ready':
      return ready(lastOf('empty')) && ready(lastOf('full')) ? 'review_commit' : 'capture_missing';
    case 'committing':
      return 'wait_confirm';
    case 'cancel_pending':
      return 'wait_cancel';
    case 'active':
      return 'done';
    case 'cancelled':
    case 'expired':
    case 'failed':
      return 'closed';
    default:
      return 'unknown';
  }
}

export function newClientId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = (Math.random() * 16) | 0;
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

const encode = (value) => encodeURIComponent(value);

export function calibrationPaths({ branchId, roiId, calibrationId, action } = {}) {
  if (!branchId) throw invalidRequest('Falta la sucursal.');
  if (!roiId) throw invalidRequest('Falta la zona.');
  let path = `/branches/${encode(branchId)}/rois/${encode(roiId)}/calibrations`;
  if (calibrationId) path += `/${encode(calibrationId)}`;
  if (action) path += `/${encode(action)}`;
  return path;
}

export function snapshotPath({ branchId, snapshotId } = {}) {
  if (!branchId) throw invalidRequest('Falta la sucursal.');
  if (!snapshotId) throw invalidRequest('Falta la imagen.');
  return `/branches/${encode(branchId)}/snapshots/${encode(snapshotId)}`;
}

function invalidRequest(message) {
  const error = new Error(message);
  error.code = 'invalid_request';
  return error;
}

function requireSessionVersion(value) {
  if (!Number.isInteger(value) || value < 1) throw invalidRequest('Falta la versión de la sesión.');
  return value;
}

function requireId(value, message) {
  if (typeof value !== 'string' || value.trim() === '') throw invalidRequest(message);
  return value;
}

export function buildCaptureBody({ kind, captureId, sessionVersion } = {}) {
  if (!CAPTURE_KINDS.includes(kind)) throw invalidRequest('La referencia debe ser vacía o abastecida.');
  return {
    kind,
    capture_id: requireId(captureId, 'Falta el identificador de la captura.'),
    session_version: requireSessionVersion(sessionVersion),
  };
}

export function buildCommitBody({ sessionVersion, references = {} } = {}) {
  const empty = requireId(references.empty?.captureId, 'Falta la captura de la zona vacía.');
  const full = requireId(references.full?.captureId, 'Falta la captura de la zona abastecida.');
  if (empty === full) throw invalidRequest('Las dos referencias deben ser capturas distintas.');
  return {
    session_version: requireSessionVersion(sessionVersion),
    references: { empty: { capture_id: empty }, full: { capture_id: full } },
  };
}

function normalizeProduct(product) {
  if (!product) return null;
  return { id: product.id ?? null, sku: product.sku ?? '', name: product.name ?? '' };
}

function normalizeReference(reference = {}) {
  return {
    captureId: reference.capture_id ?? reference.captureId ?? null,
    kind: reference.kind ?? null,
    status: reference.status ?? 'unknown',
    capturedAt: reference.captured_at ?? null,
    receivedAt: reference.received_at ?? null,
    imageId: reference.image_id ?? null,
    descriptorCrc: reference.descriptor_crc ?? null,
    clockQuality: reference.clock_quality ?? null,
  };
}

function normalizeOperation(operation = {}) {
  return {
    operationId: operation.operation_id ?? null,
    action: operation.action ?? null,
    status: operation.status ?? null,
    attempts: operation.attempts ?? null,
    code: operation.code ?? null,
    updatedAt: operation.updated_at ?? null,
  };
}

export function normalizeSession(raw = {}) {
  return {
    id: raw.id ?? null,
    roiId: raw.roi_id ?? raw.roiId ?? null,
    state: raw.state ?? 'draft',
    sessionVersion: raw.session_version ?? 0,
    calibrationVersion: raw.calibration_version ?? null,
    configVersion: raw.config_version ?? null,
    contextHash: raw.context_hash ?? null,
    product: normalizeProduct(raw.product),
    active: raw.active ? {
      calibrationVersion: raw.active.calibration_version ?? null,
      confirmedAt: raw.active.confirmed_at ?? null,
      contextValid: raw.active.context_valid !== false,
    } : null,
    references: Array.isArray(raw.references) ? raw.references.map(normalizeReference) : [],
    operations: Array.isArray(raw.operations) ? raw.operations.map(normalizeOperation) : [],
    createdAt: raw.created_at ?? null,
    expiresAt: raw.expires_at ?? null,
    confirmedAt: raw.confirmed_at ?? null,
  };
}

export function normalizeSessionSummary(raw = {}) {
  return {
    id: raw.id ?? null,
    state: raw.state ?? 'draft',
    sessionVersion: raw.session_version ?? null,
    calibrationVersion: raw.calibration_version ?? null,
    configVersion: raw.config_version ?? null,
    contextValid: raw.context_valid !== false,
    product: normalizeProduct(raw.product),
    createdAt: raw.created_at ?? null,
    confirmedAt: raw.confirmed_at ?? null,
  };
}

export function normalizeOperationAccepted(raw = {}) {
  return {
    operationId: raw.operation_id ?? null,
    sessionVersion: raw.session_version ?? null,
    state: raw.state ?? null,
    expiresAt: raw.expires_at ?? null,
    capture: raw.capture ? {
      captureId: raw.capture.capture_id ?? null,
      kind: raw.capture.kind ?? null,
      status: raw.capture.status ?? 'unknown',
    } : null,
  };
}

const ERROR_TEXT = {
  busy: 'La cámara está ocupada con otra calibración. Espera a que termine e inténtalo de nuevo.',
  invalid_state: 'La calibración ya cambió de paso. Vuelve a abrir la zona para continuar.',
  session_conflict: 'Otra persona cambió esta calibración. Vuelve a cargar la zona.',
  context_mismatch: 'El producto o la zona cambiaron. Vuelve a cargar la zona y calibra de nuevo.',
  config_mismatch: 'La configuración de zonas cambió. Vuelve a cargar la zona antes de calibrar.',
  incomplete_pair: 'Faltan las dos referencias o una todavía no está lista.',
  operation_conflict: 'Ya existe una operación con esos datos. Consulta el estado antes de repetirla.',
  idempotency_conflict: 'Se repitió la solicitud con datos distintos. Abre la zona de nuevo.',
  reference_too_similar: 'Las dos capturas se parecen demasiado. Vacía o abastece la zona de forma más clara y repite.',
  capture_failed: 'La cámara no pudo tomar la foto. Inténtalo de nuevo.',
  invalid_frame: 'La cámara no obtuvo una imagen válida. Revisa la iluminación e inténtalo otra vez.',
  nvs_error: 'La cámara no pudo guardar la referencia. No se activó nada; inténtalo de nuevo.',
  unsupported_format: 'La cámara usa un formato de referencia no compatible. Actualiza el dispositivo.',
  session_expired: 'La calibración caducó. Inicia una nueva.',
  node_timeout: 'La cámara no confirmó a tiempo. Estamos comprobando el estado; no repitas la captura todavía.',
  node_rejected: 'La cámara rechazó la operación. Revisa el estado de la zona.',
  camera_unavailable: 'No pudimos comunicarnos con la cámara. Verifica que esté encendida.',
  gateway_offline: 'El gateway no está conectado. Inténtalo cuando recupere la conexión.',
  roi_not_found: 'No encontramos esta zona. Vuelve a la lista de dispositivos y ábrela de nuevo.',
  calibration_not_found: 'No encontramos esta calibración. Vuelve a abrir la zona.',
  permission_denied: 'No tienes permiso para calibrar esta zona. Consulta con un administrador.',
  branch_forbidden: 'No tienes permiso para calibrar esta zona. Consulta con un administrador.',
};

export function calibrationErrorText(error) {
  const code = error?.code;
  if (code && ERROR_TEXT[code]) return ERROR_TEXT[code];
  const status = Number(error?.status ?? 0);
  if (status === 0) return 'No pudimos comunicarnos con el sistema. Revisa tu conexión e inténtalo de nuevo.';
  if (status === 401) return 'Tu sesión venció. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permiso para calibrar esta zona. Consulta con un administrador.';
  if (status === 404) return 'No encontramos esta zona. Vuelve a la lista de dispositivos y ábrela de nuevo.';
  if (status === 408) return 'La cámara no respondió a tiempo. Estamos comprobando el estado; no repitas la captura todavía.';
  if (status >= 500) return 'El servicio de calibración no está disponible. Inténtalo más tarde.';
  return 'No pudimos completar la calibración. Inténtalo de nuevo.';
}
