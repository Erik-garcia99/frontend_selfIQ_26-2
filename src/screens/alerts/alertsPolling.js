// Un único request en vuelo. Una respuesta posterior a stop nunca llega a UI.
export function pollAlerts({ load, onData, onError, onBusy,
  schedule = setTimeout, cancel = clearTimeout, interval = 3000 }) {
  let active = true;
  let timer;
  async function tick() {
    if (!active) return;
    onBusy(true);
    try {
      const data = await load();
      if (active) onData(data);
    } catch (error) {
      if (active) onError(error);
    } finally {
      if (active) {
        onBusy(false);
        timer = schedule(tick, interval);
      }
    }
  }
  // El arranque asíncrono permite cancelar incluso antes del primer request.
  Promise.resolve().then(tick);
  return () => { active = false; cancel(timer); };
}
