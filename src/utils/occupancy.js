export function occupancyPresentation({ data, stale = false, error = '', loading = false, branchId }) {
  const value = data?.occupancy;
  const hasValue = typeof value === 'number' && Number.isInteger(value) && value >= 0;
  const label = hasValue ? String(value) : '—';
  if (error) return { label, tone: 'unavailable', status: 'Sin conexión', detail: 'No se pudo actualizar el aforo. Intenta de nuevo.' };
  if (loading && !hasValue) return { label, tone: 'unavailable', status: 'Cargando…', detail: 'Consultando el aforo de la sucursal.' };
  if (!branchId) return { label, tone: 'unavailable', status: 'Sin sucursal', detail: 'No tienes una sucursal disponible para consultar.' };
  if (!hasValue) return { label, tone: 'unavailable', status: 'Sin lecturas', detail: 'No hay lecturas de aforo en el periodo consultado.' };
  if (stale || data.status === 'stale') return { label, tone: 'unavailable', status: 'Sin actualizar', detail: 'Esta es la última lectura recibida, pero está desactualizada.' };
  return { label, tone: 'available', status: `${value} ${value === 1 ? 'persona' : 'personas'}`, detail: `Aforo actual: ${value} ${value === 1 ? 'persona' : 'personas'} en la sucursal.` };
}
