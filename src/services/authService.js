import { apiRequest } from './http';
export const login = (email, password) => apiRequest('/auth/login', { method: 'POST', body: { email, password } });
export const register = (payload) => apiRequest('/auth/register', { method: 'POST', body: payload });
export const getCurrentUser = (accessToken) => apiRequest('/auth/me', { accessToken });
export const approveUser = (id, accessToken) => apiRequest(`/auth/approve/${encodeURIComponent(id)}`, { method: 'POST', accessToken });
export const getPendingUsers = (accessToken) => apiRequest('/auth/pending', { accessToken });
export const rejectUser = (id, accessToken) => apiRequest(`/auth/reject/${encodeURIComponent(id)}`, { method: 'POST', accessToken });
