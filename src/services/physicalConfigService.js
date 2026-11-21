import { apiRequest } from './http.js';

export function physicalConfigService(accessToken, branchId) {
  const root = `/branches/${encodeURIComponent(branchId)}`;
  const productPath = id => `${root}/products/${encodeURIComponent(id)}`;
  const request = (path, body) => apiRequest(path, {
    accessToken, ...(body ? { method: 'PUT', body } : {}),
  });
  return {
    getSpec: id => request(`${productPath(id)}/physical-spec`),
    listRois: id => request(`${productPath(id)}/roi-configs`),
    saveSpec: (id, body) => request(`${productPath(id)}/physical-spec`, body),
    saveRoi: (id, body) => request(`${root}/rois/${encodeURIComponent(id)}/physical-config`, body),
  };
}
