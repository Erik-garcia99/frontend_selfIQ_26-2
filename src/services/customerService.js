import { apiRequest } from './http.js';

/**
 * Consulta las sucursales activas de la organización del cliente autenticado.
 * Máximo 5 por página según decisión D-C17.
 */
export function getCustomerBranches(accessToken, { page = 1, pageSize = 5, q = '' } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (pageSize) params.set('page_size', String(pageSize));
  if (q && q.trim()) params.set('q', q.trim());
  return apiRequest(`/customer/branches?${params}`, { accessToken });
}

/**
 * Consulta el estado y aforo en tiempo real de la sucursal seleccionada.
 */
export async function getCustomerHome(accessToken, branchId) {
  if (!branchId) throw new Error('Se requiere un identificador de sucursal.');
  return apiRequest(`/customer/home?branch_id=${encodeURIComponent(branchId)}`, { accessToken });
}
