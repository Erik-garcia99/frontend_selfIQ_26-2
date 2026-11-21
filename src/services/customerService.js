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

/**
 * Consulta las categorías de productos disponibles en la sucursal.
 */
export async function getCustomerCategories(accessToken, branchId) {
  if (!branchId) throw new Error('Se requiere un identificador de sucursal.');
  return apiRequest(`/customer/branches/${encodeURIComponent(branchId)}/categories`, { accessToken });
}

/**
 * Consulta los estantes de una sucursal (solo lectura) para el cliente.
 * Devuelve resumen: nombre, ubicación textual, conteo de productos y con guía.
 */
export async function getCustomerShelves(accessToken, branchId, { page = 1, pageSize = 5 } = {}) {
  if (!branchId) throw new Error('Se requiere un identificador de sucursal.');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (pageSize) params.set('page_size', String(pageSize));
  return apiRequest(`/customer/branches/${encodeURIComponent(branchId)}/shelves?${params}`, { accessToken });
}
export async function getCustomerProducts(accessToken, branchId, { q = '', category = '', page = 1, pageSize = 20 } = {}) {
  if (!branchId) throw new Error('Se requiere un identificador de sucursal.');
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (pageSize) params.set('page_size', String(pageSize));
  if (q && q.trim()) params.set('q', q.trim());
  if (category && category.trim()) params.set('category', category.trim());
  return apiRequest(`/customer/branches/${encodeURIComponent(branchId)}/products?${params}`, { accessToken });
}
