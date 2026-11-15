import { apiRequest } from './http.js';

export function listAlerts(accessToken, branchId, filters = {}) {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) query.set(name, String(value));
  }
  return apiRequest(`/branches/${encodeURIComponent(branchId)}/alerts?${query}`, { accessToken });
}

export function acknowledgeAlert(accessToken, branchId, alertId) {
  return apiRequest(`/branches/${encodeURIComponent(branchId)}/alerts/${encodeURIComponent(alertId)}/acknowledge`,
    { accessToken, method: 'POST' });
}

export function listAlertLocations(accessToken, branchId) {
  return apiRequest(`/branches/${encodeURIComponent(branchId)}/alert-locations`, { accessToken });
}
