// Contrato compartido de la guía LED (GL-5 staff / GL-6 cliente).
// Mismo servicio para "Probar LED" del encargado y "Guiar" del cliente:
// el backend resuelve producto → estante → luz. La app nunca envía canal/GPIO.
import { apiRequest } from './http';

const guidePath = (branchId) =>
  `/branches/${encodeURIComponent(branchId)}/guide-requests`;

export function newIdempotencyKey() {
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function createGuideRequest({ branchId, productId, accessToken, idempotencyKey }) {
  return apiRequest(guidePath(branchId), {
    method: 'POST',
    accessToken,
    headers: { 'Idempotency-Key': idempotencyKey || newIdempotencyKey() },
    body: { product_id: productId },
  });
}

export async function getGuideRequest({ branchId, requestId, accessToken }) {
  return apiRequest(`${guidePath(branchId)}/${encodeURIComponent(requestId)}`, { accessToken });
}

export async function confirmGuideRequest({ branchId, requestId, accessToken }) {
  return apiRequest(`${guidePath(branchId)}/${encodeURIComponent(requestId)}/confirm`, {
    method: 'POST',
    accessToken,
  });
}

export async function cancelGuideRequest({ branchId, requestId, accessToken }) {
  return apiRequest(`${guidePath(branchId)}/${encodeURIComponent(requestId)}`, {
    method: 'DELETE',
    accessToken,
  });
}

export const GUIDE_TERMINAL = new Set(['confirmed', 'cancelled', 'expired', 'failed']);

export function guideMessage(state) {
  if (!state) return 'Preparando la guía…';
  if (state.closing) return 'Apagando la guía…';
  switch (state.status) {
    case 'pending': return 'Activando la guía…';
    case 'active': return state.light === 'on'
      ? 'Sigue la luz hasta el estante.'
      : 'La guía está en curso, esperando confirmación de la luz.';
    case 'confirmed': return 'Guía finalizada.';
    case 'cancelled': return 'Guía cancelada.';
    case 'expired': return 'La guía venció. Vuelve a intentarlo si la necesitas.';
    case 'failed': return state.reason === 'off_unverified'
      ? 'No se pudo confirmar que la luz se apagara. No la des por apagada.'
      : 'No se pudo completar la guía. Inténtalo de nuevo.';
    default: return 'Consultando el estado de la guía…';
  }
}
