// S-04 / S-11: bitácora e historial de cambios. Reutiliza el cliente HTTP
// existente (apiRequest) y la misma base de la app; no crea otro cliente.
import { apiRequest, API_BASE_URL } from './http.js';

const root = (branchId) => `/branches/${encodeURIComponent(branchId)}`;

function query(filters = {}, extra = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key === 'nodeId' ? 'node_id' : key, value);
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== null) params.set(key, value);
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}

export const logsService = {
  list({ branchId, accessToken, filters = {}, offset = 0, limit = 50 }) {
    return apiRequest(
      `${root(branchId)}/logs${query(filters, { offset, limit })}`,
      { accessToken });
  },

  nodeHistory({ branchId, nodeId, accessToken, offset = 0, limit = 50 }) {
    return apiRequest(
      `${root(branchId)}/logs/nodes/${encodeURIComponent(nodeId)}${query({}, { offset, limit })}`,
      { accessToken });
  },

  // El CSV no es JSON: apiRequest solo sirve respuestas JSON, así que esta
  // descarga usa fetch con el mismo token y la misma URL base.
  async exportText({ branchId, accessToken, filters = {} }) {
    const response = await fetch(
      `${API_BASE_URL}${root(branchId)}/logs/export${query(filters)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error('No se pudo descargar la bitácora. Inténtalo de nuevo.');
    return response.text();
  },
};
