import { API_BASE_URL, validateApiConfiguration } from '../config/env';
export { API_BASE_URL } from '../config/env';
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) { onUnauthorized = handler; }
export class ApiError extends Error {
  constructor(message, status) { super(message); this.name = 'ApiError'; this.status = status; }
}
function errorMessage(detail, status) {
  if (Array.isArray(detail)) return detail.map((item) => item.msg || 'Dato inválido').join('\n');
  if (typeof detail === 'string') return detail;
  return status === 401 ? 'Tu sesión venció. Inicia sesión nuevamente.' : 'No se pudo completar la solicitud.';
}
export async function apiRequest(path, options = {}) {
  try { validateApiConfiguration(); }
  catch (error) { throw new ApiError(error.message, 0); }
  const { accessToken, timeout = 15000, ...request } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...request,
      body: request.body && typeof request.body !== 'string' ? JSON.stringify(request.body) : request.body,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(request.headers || {}) },
      signal: controller.signal,
    });
    if (response.status === 401 && accessToken) onUnauthorized?.();
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch {
      // Railway puede responder texto/HTML cuando el servicio no está disponible.
      throw new ApiError(response.ok ? 'El backend devolvió una respuesta inesperada.' :
        errorMessage(null, response.status), response.status);
    }
    if (!response.ok) {
      throw new ApiError(errorMessage(data.detail, response.status), response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') throw new ApiError('La solicitud tardó demasiado. Consulta el estado antes de repetir una operación.', 408);
    throw new ApiError(`No se pudo conectar con el backend (${API_BASE_URL}). Comprueba tu conexión y que el servicio esté disponible. Si usas la versión web, revisa también CORS en el backend.`, 0);
  } finally { clearTimeout(timer); }
}
