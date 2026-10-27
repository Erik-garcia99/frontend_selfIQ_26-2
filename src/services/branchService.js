import { apiRequest, ApiError } from './http';
async function withToken(promise, field) {
  const result = await promise;
  if (typeof result[field] !== 'string' || !result[field]) throw new ApiError('La operación no devolvió su token. Comprueba que el backend esté actualizado antes de repetirla.', 502);
  return result;
}
export const createBranch = (payload, accessToken) => withToken(apiRequest('/branches', { method: 'POST', body: payload, accessToken }), 'branch_token');
export const issueBusinessToken = (id, accessToken) => withToken(apiRequest(`/businesses/${encodeURIComponent(id)}/token`, { method: 'POST', accessToken }), 'business_token');
export const issueBranchToken = (id, accessToken) => withToken(apiRequest(`/branches/${encodeURIComponent(id)}/token`, { method: 'POST', accessToken }), 'branch_token');
