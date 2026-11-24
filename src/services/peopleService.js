// F-02 (ME-9): administración de personas. Reutiliza el cliente HTTP de la app;
// no crea otro cliente ni guarda secretos en el dispositivo.
import { apiRequest } from './http.js';

const root = (branchId) => `/branches/${encodeURIComponent(branchId)}`;
const id = (value) => encodeURIComponent(value);

export const peopleService = {
  // El backend devuelve {items}. `includeInactive` permite ver bajas conservadas.
  listEmployees({ branchId, accessToken, includeInactive = false }) {
    return apiRequest(`${root(branchId)}/employees${includeInactive ? '?include_inactive=true' : ''}`, { accessToken });
  },
  createEmployee({ branchId, accessToken, data }) {
    return apiRequest(`${root(branchId)}/employees`, { method: 'POST', accessToken, body: data });
  },
  updateEmployee({ branchId, userId, accessToken, data }) {
    return apiRequest(`${root(branchId)}/employees/${id(userId)}`, { method: 'PATCH', accessToken, body: data });
  },
  deactivateEmployee({ branchId, userId, accessToken }) {
    return apiRequest(`${root(branchId)}/employees/${id(userId)}`, { method: 'DELETE', accessToken });
  },

  listCustomers({ branchId, accessToken, includeInactive = false }) {
    return apiRequest(`${root(branchId)}/customers${includeInactive ? '?include_inactive=true' : ''}`, { accessToken });
  },
  createCustomer({ branchId, accessToken, data }) {
    return apiRequest(`${root(branchId)}/customers`, { method: 'POST', accessToken, body: data });
  },
  updateCustomer({ branchId, userId, accessToken, data }) {
    return apiRequest(`${root(branchId)}/customers/${id(userId)}`, { method: 'PATCH', accessToken, body: data });
  },
  deactivateCustomer({ branchId, userId, accessToken }) {
    return apiRequest(`${root(branchId)}/customers/${id(userId)}`, { method: 'DELETE', accessToken });
  },
  customerPurchases({ branchId, userId, accessToken }) {
    return apiRequest(`${root(branchId)}/customers/${id(userId)}/purchases`, { accessToken });
  },

  listSuppliers({ branchId, accessToken, includeInactive = false }) {
    return apiRequest(`${root(branchId)}/suppliers${includeInactive ? '?include_inactive=true' : ''}`, { accessToken });
  },
  createSupplier({ branchId, accessToken, data }) {
    return apiRequest(`${root(branchId)}/suppliers`, { method: 'POST', accessToken, body: data });
  },
  updateSupplier({ branchId, supplierId, accessToken, data }) {
    return apiRequest(`${root(branchId)}/suppliers/${id(supplierId)}`, { method: 'PATCH', accessToken, body: data });
  },
  deactivateSupplier({ branchId, supplierId, accessToken }) {
    return apiRequest(`${root(branchId)}/suppliers/${id(supplierId)}`, { method: 'DELETE', accessToken });
  },
  supplierProducts({ branchId, supplierId, accessToken }) {
    return apiRequest(`${root(branchId)}/suppliers/${id(supplierId)}/products`, { accessToken });
  },
  replaceSupplierProducts({ branchId, supplierId, accessToken, products }) {
    return apiRequest(`${root(branchId)}/suppliers/${id(supplierId)}/products`, {
      method: 'PUT', accessToken, body: { products },
    });
  },
};
