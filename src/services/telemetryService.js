import { apiRequest } from './http.js';
import { normalizeRoiOccupancy } from '../utils/roiOccupancy.js';

export const getTelemetryBranches = (accessToken) => apiRequest('/telemetry/branches', { accessToken });
export const getLatestTemperature = (branchId, accessToken) => apiRequest(
  `/branches/${encodeURIComponent(branchId)}/telemetry/temperature/latest`, { accessToken },
);
export const getLatestOccupancy = (branchId, accessToken) => apiRequest(
  `/branches/${encodeURIComponent(branchId)}/telemetry/occupancy/latest`, { accessToken },
);

export async function getLatestRoiOccupancy({ branchId, roiId, accessToken }) {
  const value = await apiRequest(
    `/branches/${encodeURIComponent(branchId)}/rois/${encodeURIComponent(roiId)}/occupancy/latest`,
    { accessToken },
  );
  return normalizeRoiOccupancy(value, { branchId, roiId });
}
