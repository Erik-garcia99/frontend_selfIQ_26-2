// Integration boundary: install the adapter after the server contract is agreed.
// Never synthesize devices, telemetry, confirmations or successful saves here.
let adapter = null;
export const LIGHT_LIMIT = 10;
export function configureDeviceAdapter(value) { adapter = value; }
export async function deviceRequest(operation, context, payload = {}) {
  if (!context.branchId) throw new Error('Tu cuenta necesita una sucursal asignada para administrar dispositivos.');
  if (!adapter || typeof adapter[operation] !== 'function') {
    const error = new Error('Esta función todavía no está disponible. Inténtalo más tarde.'); error.code = 'NOT_AVAILABLE'; throw error;
  }
  const result = await adapter[operation]({ ...payload, ...context });
  if (['listGateways', 'listDevices', 'listShelves', 'listLightChannels'].includes(operation)) {
    if (!Array.isArray(result) || result.some(item => item?.id == null)) throw new Error('Invalid list response');
  }
  if (['getGuide', 'getDevice', 'registerDevice', 'updateDevice', 'addLight', 'updateLight', 'startDiscovery'].includes(operation) && result?.id == null) {
    throw new Error('Missing confirmed identifier');
  }
  if (operation === 'getGuide' && !Array.isArray(result.lights)) throw new Error('Invalid lights response');
  return result;
}
export function deviceLabel(device) {
  return device?.name || ({ guide: 'Guía de luces', occupancy: 'Control de aforo', camera: 'Cámara', environment: 'Sensor ambiental' }[device?.type]) || 'Dispositivo';
}
export function statusLabel(device) {
  return device?.online === true ? 'Conectado' : device?.online === false ? 'Sin conexión' : 'Sin información de conexión';
}
export function validLight(draft) { return !!draft?.name?.trim() && !!draft?.shelfId && draft?.channel != null; }
