import { apiRequest } from './http';

// Contrato real del backend (backend-proyecto-2026_2/app/main.py):
//   GET  /health · POST /auth/register · POST /auth/login · GET /auth/me
//   POST /branches · POST /auth/approve/{user_id}
//   POST /businesses/{business_id}/token · POST /branches/{branch_id}/token
//   GET  /gateways · GET /gateways/{id} · POST /gateways/{id}/token
//   POST /gateways/{id}/commands · POST /gateways/{id}/nodes/register
//   GET  /branches/{branch_id}/nodes
//
// NO existen: perfil editable, cambio de contraseña, preferencias de
// notificaciones ni recuperación por correo. `CAPABILITIES` mantiene esas
// pantallas en modo lectura hasta que el endpoint exista: cuando lo agregues,
// poné la bandera en true y descomentá la llamada correspondiente.
export const CAPABILITIES = { editProfile: false, changePassword: false, notificationPreferences: false };

// Contrato propuesto (aún sin implementar en el backend).
const PROFILE_PATH = '/auth/me';
const PASSWORD_PATH = '/auth/change-password';

export const updateProfile = (payload, accessToken) => apiRequest(PROFILE_PATH, { method: 'PATCH', body: payload, accessToken });

export const changePassword = (currentPassword, newPassword, accessToken) =>
  apiRequest(PASSWORD_PATH, { method: 'POST', body: { current_password: currentPassword, new_password: newPassword }, accessToken });
