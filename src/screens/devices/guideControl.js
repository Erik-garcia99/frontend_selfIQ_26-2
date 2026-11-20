export function guideIsOpen(state) {
  return !!state && ['pending', 'active'].includes(state.status);
}

export function ledStateLabel(state) {
  if (!state) return 'Sin consultar';
  if (state.closing) return 'Apagando…';
  if (state.light === 'on') return 'ON';
  if (state.light === 'off') return 'OFF';
  return 'Desconocido';
}

export function guideControlError(error) {
  if (error?.status === 404 && /^not found$/i.test(error.message || '')) return 'El backend no tiene disponible esta ruta de guía. Actualiza el backend antes de usar ON / OFF.';
  if (error?.status === 404) return 'No se encontró una asociación de guía válida para este producto. Actualiza la lista y revisa su LED y nodo; no se necesita un ROI de cámara.';
  if (error?.status === 409) return 'El LED está ocupado o la solicitud entra en conflicto. Espera a que termine la otra guía.';
  if (error?.status === 503 && error.message === 'guide_capabilities_missing') return 'El backend aún no ha registrado los canales del nodo LED. Revisa el envío de capacidades desde la Raspberry; recibir el heartbeat no basta.';
  if (error?.status === 503) return 'La guía no está disponible. Comprueba el gateway y que el nodo haya informado sus canales.';
  return error?.message || 'No se pudo completar la orden. El estado del LED es desconocido.';
}

// Un request por vez; cancelar descarta incluso una respuesta ya en vuelo.
export function pollGuide({ load, onState, onError, schedule = setTimeout, cancel = clearTimeout }) {
  let stopped = false;
  let timer;
  async function tick() {
    if (stopped) return;
    try {
      const state = await load();
      if (stopped) return;
      onState(state);
      if (!guideIsOpen(state)) return;
    } catch (error) {
      if (stopped) return;
      onError(error);
    }
    if (!stopped) timer = schedule(tick, 1500);
  }
  tick();
  return () => { stopped = true; cancel(timer); };
}
