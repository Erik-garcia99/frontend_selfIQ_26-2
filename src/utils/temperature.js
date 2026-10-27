import { TEMPERATURE_LIMITS } from '../config/temperature.js';

export function temperaturePresentation({ data, stale = false, error = '', loading = false, branchId }) {
  const value = data?.temperature_c;
  const hasValue = typeof value === 'number' && Number.isFinite(value);
  const label = hasValue ? `${value.toLocaleString('es-MX', { maximumFractionDigits: 1 })} °C` : '— °C';
  if (error) return { label, tone: 'unavailable', status: 'Sin conexión', detail: 'No se pudo actualizar la temperatura. Intenta de nuevo.' };
  if (loading && !hasValue) return { label, tone: 'unavailable', status: 'Cargando…', detail: 'Consultando la temperatura de la sucursal.' };
  if (!branchId) return { label, tone: 'unavailable', status: 'Sin sucursal', detail: 'No tienes una sucursal disponible para consultar.' };
  if (!hasValue) return { label, tone: 'unavailable', status: 'Sin lecturas', detail: 'No hay lecturas de temperatura en el periodo consultado.' };
  if (stale || data.status === 'stale') return { label, tone: 'unavailable', status: 'Sin actualizar', detail: 'Esta es la última lectura recibida, pero está desactualizada.' };
  if (value < TEMPERATURE_LIMITS.coldBelow) return { label, tone: 'cold', status: 'Frío', detail: 'La temperatura está por debajo de 15 °C.' };
  if (value >= TEMPERATURE_LIMITS.hotAtOrAbove) return { label, tone: 'hot', status: 'Calor', detail: 'Temperatura alta: está en 35 °C o más.' };
  return { label, tone: 'comfortable', status: 'Agradable', detail: 'La temperatura está dentro del intervalo configurado.' };
}
