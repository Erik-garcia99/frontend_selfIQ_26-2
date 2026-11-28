import { apiRequest } from './http.js';

const draftPath = (branchId) => {
  if (!branchId) throw new Error('Selecciona una sucursal para preparar el mapa.');
  return `/branches/${encodeURIComponent(branchId)}/map/draft`;
};

export const mapService = {
  readDraft({ branchId, accessToken }) {
    return apiRequest(draftPath(branchId), { accessToken });
  },
  saveDraft({ branchId, accessToken, baseVersion, document }) {
    return apiRequest(draftPath(branchId), {
      method: 'PUT', accessToken, body: { base_version: baseVersion, document },
    });
  },
};
