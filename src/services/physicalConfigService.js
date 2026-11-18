import { apiRequest } from './http.js';

export function listRoiConfigs(accessToken, branchId, productId) {
  return apiRequest(
    `/branches/${encodeURIComponent(branchId)}/products/${encodeURIComponent(productId)}/roi-configs`,
    { accessToken },
  );
}

export function saveRoiConfig(accessToken, branchId, roiId, body) {
  return apiRequest(
    `/branches/${encodeURIComponent(branchId)}/rois/${encodeURIComponent(roiId)}/physical-config`,
    { accessToken, method: 'PUT', body },
  );
}
