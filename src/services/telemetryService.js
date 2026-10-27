import { apiRequest } from './http';

export const getTelemetryBranches = (accessToken) => apiRequest('/telemetry/branches', { accessToken });
export const getLatestTemperature = (branchId, accessToken) => apiRequest(
  `/branches/${encodeURIComponent(branchId)}/telemetry/temperature/latest`, { accessToken },
);
