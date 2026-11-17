// Shelf visual area, not people occupancy or logical POS inventory.
export function normalizeRoiOccupancy(value, { branchId, roiId }) {
  const invalid = () => { throw new Error('El servidor devolvió una lectura de zona inválida.'); };
  if (!value || value.branch_id !== branchId || value.roi_id !== roiId ||
      !['ok', 'stale', 'no_data'].includes(value.status)) invalid();
  if (value.status === 'no_data') {
    if (value.occupancy_pct !== null || value.received_at !== null) invalid();
    return { ...value, occupancy_pct: null };
  }
  if (!Number.isInteger(value.occupancy_pct) || value.occupancy_pct < 0 || value.occupancy_pct > 100 ||
      !Number.isInteger(value.config_version) || value.config_version < 1 ||
      !Number.isInteger(value.calibration_version) || value.calibration_version < 1 ||
      typeof value.received_at !== 'string' || !Number.isFinite(Date.parse(value.received_at)) ||
      !Number.isFinite(value.age_seconds) || value.age_seconds < 0 ||
      !Number.isFinite(value.stale_after_seconds) || value.stale_after_seconds <= 0 ||
      value.clock_quality !== 'gateway_received') invalid();
  return value;
}

export function roiOccupancyPresentation({ reading, loading, error, fetchedAt }, now = Date.now()) {
  if (error) return { label: '—', status: 'No se pudo consultar', detail: error, outdated: false };
  if (!reading) return {
    label: '—', status: loading ? 'Cargando…' : 'Sin datos',
    detail: loading ? 'Consultando la ocupación de esta zona.' : 'Todavía no hay una lectura.',
    outdated: false,
  };
  if (reading.status === 'no_data') return {
    label: '—', status: 'Sin datos', outdated: false,
    detail: 'No hay lecturas para la configuración y calibración actuales. Revisa que la zona esté preparada y la cámara esté midiendo.',
  };
  // Age is anchored to the API's age, not to the phone's UTC clock.
  const elapsed = Math.max(0, Math.floor((now - fetchedAt) / 1000));
  const age = Math.floor(reading.age_seconds + elapsed);
  const outdated = reading.status === 'stale' || age >= reading.stale_after_seconds;
  return {
    label: `${reading.occupancy_pct} %`,
    status: outdated ? 'Sin actualizar' : 'Lectura reciente',
    detail: `Recibida en el gateway hace ${age} s. No es la hora de captura.`,
    outdated,
  };
}

export function roiOccupancyError(error) {
  if (error?.status === 401) return 'Tu sesión venció. Inicia sesión nuevamente.';
  if (error?.status === 403) return 'No tienes acceso a esta zona.';
  if (error?.status === 404) return 'La zona ya no está disponible. Actualiza la lista de zonas.';
  return 'No pudimos consultar esta zona. Comprueba la conexión e inténtalo de nuevo.';
}

// Framework-independent scheduler so races/background/unmount can be tested.
export function createRoiOccupancyPoller({
  load, onChange, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout,
  interval = 10000,
}) {
  let running = true;
  let active = false;
  let inFlight = false;
  let queued = false;
  let generation = 0;
  let timer;
  let state = { reading: null, loading: true, error: '', fetchedAt: null };
  const cancelTimer = () => { clearTimer(timer); timer = undefined; };
  const publish = (change) => { state = { ...state, ...change }; onChange(state); };
  async function poll() {
    if (!running || !active) return;
    cancelTimer();
    if (inFlight) { queued = true; return; }
    inFlight = true;
    queued = false;
    const current = generation;
    publish({ loading: true });
    try {
      const reading = await load();
      if (running && active && current === generation)
        publish({ reading, error: '', fetchedAt: now(), loading: false });
    } catch (error) {
      if (running && active && current === generation)
        publish({ reading: null, error: roiOccupancyError(error), loading: false, fetchedAt: null });
    } finally {
      inFlight = false;
      if (running && active) {
        if (queued) { queued = false; void poll(); }
        else timer = setTimer(poll, interval);
      }
    }
  }
  return {
    setActive(value) {
      if (!running || active === value) return;
      active = value;
      generation += 1;
      cancelTimer();
      if (active) void poll();
      else queued = false;
    },
    refresh() { void poll(); },
    stop() { running = false; active = false; generation += 1; cancelTimer(); },
  };
}
