// Preferencias locales de notificaciones.
// El backend todavía no expone un endpoint de preferencias, así que se guardan
// en memoria: sobreviven a la navegación dentro de la sesión pero no a cerrar
// la app. Cuando exista el endpoint, `save` pasa a llamar a settingsService.
const defaults = { lowStock: true, capacity: true, temperature: true, offline: true, sound: false };

let current = { ...defaults };
const listeners = new Set();

export const notificationPreferences = () => current;

export function subscribePreferences(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function setPreferences(next) {
  current = { ...current, ...next };
  listeners.forEach((fn) => fn(current));
  return current;
}

export function resetPreferences() { setPreferences(defaults); }
