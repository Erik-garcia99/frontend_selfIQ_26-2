// Expo incorpora esta variable desde el .env situado junto a package.json.
// Aquí va la URL pública del backend FastAPI en Railway.
const configuredUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();

export const API_BASE_URL = configuredUrl.replace(/\/+$/, '');

export function validateApiConfiguration() {
  if (!API_BASE_URL) {
    throw new Error('Configura EXPO_PUBLIC_API_URL en el archivo .env con la URL pública de Railway y recarga la app.');
  }
  let url;
  try { url = new URL(API_BASE_URL); }
  catch { throw new Error('EXPO_PUBLIC_API_URL debe ser una URL completa, por ejemplo https://tu-backend.up.railway.app.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('EXPO_PUBLIC_API_URL debe ser una URL HTTP/HTTPS sin credenciales, parámetros ni fragmentos.');
  }
  // HTTP se conserva para pruebas explícitas contra un backend local.
  if (url.protocol !== 'https:' && !(typeof __DEV__ !== 'undefined' && __DEV__)) {
    throw new Error('Configura una URL HTTPS para el backend en producción.');
  }
}