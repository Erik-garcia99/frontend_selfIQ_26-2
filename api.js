import { Platform } from 'react-native';

// Para un teléfono físico define EXPO_PUBLIC_API_URL con la IP de tu equipo,
// por ejemplo: EXPO_PUBLIC_API_URL=http://192.168.1.20:8000
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

function errorMessage(detail) {
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => item.msg).join('\n');
    if (messages.includes('valid dictionary or object')) {
      return 'El servidor recibió los datos con un formato inválido. Reinicia el frontend y vuelve a intentarlo.';
    }
    return messages;
  }
  return detail || 'No se pudo conectar con el servidor';
}

export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error(`No se pudo conectar con el backend (${API_BASE_URL}).`);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errorMessage(data.detail));
  return data;
}

export const login = (email, password) => apiRequest('/auth/login', {
  method: 'POST', body: JSON.stringify({ email, password }),
});

export const register = (payload) => apiRequest('/auth/register', {
  method: 'POST', body: JSON.stringify(payload),
});

export const createBranch = (payload, accessToken) => apiRequest('/branches', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  body: JSON.stringify(payload),
});
