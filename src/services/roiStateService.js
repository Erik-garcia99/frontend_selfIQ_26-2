import { apiRequest } from './http.js';

const STATUSES = ['unknown', 'empty', 'low', 'medium', 'adequate'];
const QUALITIES = ['ok', 'stale', 'no_data', 'camera_moved', 'not_calibrated'];

function normalize(value, branchId, roiId) {
  const invalid = () => { throw new Error('El servidor devolvió un estado de repisa inválido.'); };
  if (!value || value.branch_id !== branchId || !STATUSES.includes(value.status) ||
      !QUALITIES.includes(value.quality)) invalid();
  if (roiId && value.roi_id !== roiId) invalid();
  if (value.occupancy_pct !== null &&
      (!Number.isInteger(value.occupancy_pct) || value.occupancy_pct < 0 || value.occupancy_pct > 100)) invalid();
  return value;
}

export function normalizeShelfStates(value, branchId) {
  if (!Array.isArray(value)) throw new Error('El servidor devolvió una lista de repisas inválida.');
  return value.map(item => normalize(item, branchId));
}

export function getShelfStates(accessToken, branchId) {
  return apiRequest(`/branches/${encodeURIComponent(branchId)}/shelf-states`, { accessToken })
    .then(value => normalizeShelfStates(value, branchId));
}

export function getRoiState(accessToken, branchId, roiId) {
  return apiRequest(
    `/branches/${encodeURIComponent(branchId)}/rois/${encodeURIComponent(roiId)}/state`,
    { accessToken },
  ).then(value => normalize(value, branchId, roiId));
}
