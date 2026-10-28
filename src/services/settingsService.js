import { apiRequest } from './http';

// Contrato real del backend (backend-proyecto-2026_2/app/main.py):
//   GET   /health · POST /auth/register · POST /auth/login · GET /auth/me
//   PATCH /auth/me · POST /auth/change-password
//   GET   /auth/me/preferences · PUT /auth/me/preferences
//   POST  /branches · POST /auth/approve/{user_id}
//   POST  /businesses/{business_id}/token · POST /branches/{branch_id}/token
//   GET   /gateways · GET /gateways/{id} · POST /gateways/{id}/token
//   POST  /gateways/{id}/commands · POST /gateways/{id}/nodes/register
//   GET   /branches/{branch_id}/nodes
//
// NO existen todavía: recuperación de contraseña por correo.
export const CAPABILITIES = { editProfile: true, changePassword: true, notificationPreferences: true };

const PROFILE_PATH = '/auth/me';
const PASSWORD_PATH = '/auth/change-password';
const PREFERENCES_PATH = '/auth/me/preferences';

export const updateProfile = (payload, accessToken) => apiRequest(PROFILE_PATH, { method: 'PATCH', body: payload, accessToken });

export const changePassword = (currentPassword, newPassword, accessToken) =>
  apiRequest(PASSWORD_PATH, { method: 'POST', body: { current_password: currentPassword, new_password: newPassword }, accessToken });

const fromPreferencesApi = (data) => ({
  lowStock: data.low_stock,
  capacity: data.capacity,
  temperature: data.temperature,
  offline: data.offline,
  sound: data.sound,
});

const toPreferencesApi = (prefs) => ({
  low_stock: prefs.lowStock,
  capacity: prefs.capacity,
  temperature: prefs.temperature,
  offline: prefs.offline,
  sound: prefs.sound,
});

export const getNotificationPreferences = async (accessToken) =>
  fromPreferencesApi(await apiRequest(PREFERENCES_PATH, { accessToken }));

export const saveNotificationPreferences = async (prefs, accessToken) =>
  fromPreferencesApi(await apiRequest(PREFERENCES_PATH, { method: 'PUT', body: toPreferencesApi(prefs), accessToken }));
