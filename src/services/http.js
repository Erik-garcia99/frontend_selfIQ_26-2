import { API_BASE_URL, validateApiConfiguration } from '../config/env.js';
export { API_BASE_URL } from '../config/env.js';

let onUnauthorized = null;
export function setUnauthorizedHandler(handler) { onUnauthorized = handler; }

export class ApiError extends Error {
  constructor(message, status, code = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function errorMessage(detail, status) {
  if (Array.isArray(detail)) return detail.map((item) => item.msg || 'Dato inválido').join('\n');
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail.message === 'string') return detail.message;
  return status === 401 ? 'Tu sesión venció. Inicia sesión nuevamente.' : 'No se pudo completar la solicitud.';
}

// Estas rutas gestionan la sesión por sí mismas. Reintentarlas tras un 401
// produciría un bucle de refresco, así que nunca se reintentan aquí.
const AUTH_PATHS = new Set(['/auth/login', '/auth/refresh', '/auth/logout', '/auth/register', '/auth/customer-register']);
const isAuthPath = (path) => AUTH_PATHS.has(path.split('?')[0]);

function toApiError(response, data) {
  const error = new ApiError(errorMessage(data?.detail ?? data, response.status), response.status);
  if (typeof data?.code === 'string') error.code = data.code;
  if (data?.details !== undefined) error.details = data.details;
  if (typeof data?.request_id === 'string') error.requestId = data.request_id;
  return error;
}

async function send(path, options, accessToken) {
  const { timeout = 15000, ...request } = options;
  delete request.accessToken;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...request,
      body: request.body && typeof request.body !== 'string' ? JSON.stringify(request.body) : request.body,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(request.headers || {}),
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch {
      // Railway puede responder texto/HTML cuando el servicio no está disponible.
      throw new ApiError(response.ok ? 'El backend devolvió una respuesta inesperada.' :
        errorMessage(null, response.status), response.status);
    }
    return { response, data };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') throw new ApiError('La solicitud tardó demasiado. Consulta el estado antes de repetir una operación.', 408);
    throw new ApiError(`No se pudo conectar con el backend (${API_BASE_URL}). Comprueba tu conexión y que el servicio esté disponible.`, 0);
  } finally {
    clearTimeout(timer);
  }
}

export async function apiRequest(path, options = {}) {
  try { validateApiConfiguration(); }
  catch (error) { throw new ApiError(error.message, 0); }

  const accessToken = options.accessToken || null;
  let attempt = await send(path, options, accessToken);
  if (!attempt.response.ok) {
    // Un 401 en una ruta protegida se reintenta UNA vez con el token renovado.
    // El bodies y las cabeceras de idempotencia/versión se reenvían idénticos.
    if (attempt.response.status === 401 && accessToken && !isAuthPath(path)) {
      let refreshed = null;
      try { refreshed = await onUnauthorized?.(); }
      catch { /* sesión inválida: se propaga el 401 original */ }
      if (refreshed && refreshed !== accessToken) {
        attempt = await send(path, options, refreshed);
      }
    }
    if (!attempt.response.ok) throw toApiError(attempt.response, attempt.data);
  }
  return attempt.data;
}
