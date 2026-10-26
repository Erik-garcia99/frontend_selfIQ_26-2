import { apiRequest, ApiError } from './http';
export const getGateway = (id, accessToken) => apiRequest(`/gateways/${encodeURIComponent(id)}`, { accessToken });
export async function sendGatewayCommand(id, command, accessToken) {
  const result = await apiRequest(`/gateways/${encodeURIComponent(id)}/commands`, {
    method: 'POST', accessToken, timeout: 70000, body: { command },
  });
  if (result.ok !== true) throw new ApiError(result.error || 'La Raspberry no confirmó la operación.', 409);
  return result.data;
}
