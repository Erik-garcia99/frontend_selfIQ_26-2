// Adaptador real del contrato src/services/deviceService.js.
// Traduce las operaciones del panel a los endpoints de backend/app/devices.py
// y normaliza las respuestas. Nunca inventa confirmaciones.
import { apiRequest, ApiError, API_BASE_URL } from './http';

const branchPath = (branchId) => `/branches/${encodeURIComponent(branchId)}`;
const devicePath = (branchId, deviceId) =>
  `${branchPath(branchId)}/devices/${encodeURIComponent(deviceId)}`;

function list(value) {
  if (!Array.isArray(value)) throw new ApiError('El servidor devolvió una lista inválida.', 502);
  return value;
}

function normalizeDevice(value = {}) {
  return {
    id: value.id,
    type: value.type ?? value.nodeType ?? null,
    name: value.name ?? '',
    location: value.location ?? null,
    online: typeof value.online === 'boolean' ? value.online : null,
    lastSeenAt: value.lastSeenAt ?? null,
    displayCode: value.displayCode ?? undefined,
    macAddress: value.macAddress ?? null,
    nodeCode: value.nodeCode ?? null,
    gatewayId: value.gatewayId ?? null,
    gatewayName: value.gatewayName ?? null,
    firmwareVersion: value.firmwareVersion ?? null,
    ipAddress: value.ipAddress ?? null,
    wifiRssi: typeof value.wifiRssi === 'number' ? value.wifiRssi : null,
    batteryLevelPct: typeof value.batteryLevelPct === 'number' ? value.batteryLevelPct : null,
    powerSource: value.powerSource ?? null,
    registeredAt: value.registeredAt ?? null,
  };
}

function normalizeProduct(value = {}) {
  return {
    id: value.id,
    sku: value.sku ?? '',
    name: value.name ?? '',
    active: value.active !== false,
  };
}

function normalizeGateway(value) {
  return { id: value.gateway_id, name: value.name || 'Gateway', online: value.connected === true };
}

function normalizeLight(value = {}) {
  return {
    id: value.id,
    name: value.name ?? '',
    shelfId: value.shelfId,
    shelfName: value.shelfName ?? null,
    channel: value.channel,
  };
}

function confirmed(result, message, check = () => true) {
  if (!result || !result.id || !check(result)) throw new ApiError(message, 502);
  return result;
}

// El backend entrega `X-Captured-At` como "YYYY-MM-DD HH:MM:SS.ffffff+00:00".
// Ese formato no es ISO 8601 y Hermes puede devolver Invalid Date, así que se
// normaliza antes de mostrarlo o compararlo.
function snapshotTimestamp(value) {
  if (!value) return null;
  const match = String(value).trim().match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?\s*(Z|[+-]\d{2}:?\d{2})?$/,
  );
  if (!match) return String(value);
  const [, date, time, fraction, zone = 'Z'] = match;
  const millis = (fraction || '').padEnd(3, '0').slice(0, 3);
  const offset = zone === 'Z' || zone.includes(':')
    ? zone
    : `${zone.slice(0, 3)}:${zone.slice(3)}`;
  return `${date}T${time}.${millis}${offset}`;
}

// Huella barata del JPEG. Sirve para detectar una foto nueva sin depender de la
// cabecera de fecha (que puede faltar o no ser parseable en el cliente).
function snapshotFingerprint(bytes) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${bytes.length}-${hash.toString(16)}`;
}

export const deviceAdapter = {
  async listGateways({ branchId, accessToken }) {
    const rows = await apiRequest('/gateways', { accessToken });
    return list(rows)
      .filter((gateway) => String(gateway.branch_id) === String(branchId))
      .map(normalizeGateway);
  },

  async getGateway({ gatewayId, accessToken }) {
    return confirmed(normalizeGateway(await apiRequest(`/gateways/${encodeURIComponent(gatewayId)}`, { accessToken })), 'No se pudo consultar el gateway.');
  },

  async updateGateway({ gatewayId, name, accessToken }) {
    return confirmed(normalizeGateway(await apiRequest(`/gateways/${encodeURIComponent(gatewayId)}`, {
      method: 'PATCH', accessToken, body: { name },
    })), 'No se pudo confirmar el nombre del gateway.');
  },

  async startDiscovery({ branchId, gatewayId, accessToken }) {
    const result = await apiRequest(
      `${branchPath(branchId)}/gateways/${encodeURIComponent(gatewayId)}/discovery`,
      { method: 'POST', accessToken, timeout: 70000 });
    return confirmed(result, 'La búsqueda no se pudo iniciar.');
  },

  async getDiscovery({ branchId, discoveryId, accessToken }) {
    const result = await apiRequest(
      `${branchPath(branchId)}/discoveries/${encodeURIComponent(discoveryId)}`,
      { accessToken });
    return {
      id: result.id,
      status: result.status,
      devices: list(result.devices).map(normalizeDevice),
    };
  },

  async stopDiscovery({ branchId, discoveryId, accessToken }) {
    return apiRequest(
      `${branchPath(branchId)}/discoveries/${encodeURIComponent(discoveryId)}/stop`,
      { method: 'POST', accessToken, timeout: 70000 });
  },

  async registerDevice({ branchId, discoveryId, gatewayId, deviceId, name, location, accessToken }) {
    const result = await apiRequest(`${devicePath(branchId, deviceId)}/register`, {
      method: 'POST',
      accessToken,
      body: {
        name,
        location,
        discovery_id: discoveryId || null,
        gateway_id: gatewayId || null,
      },
    });
    return confirmed(normalizeDevice(result), 'El registro del dispositivo no fue confirmado.');
  },

  async listDevices({ branchId, gatewayId, accessToken }) {
    const query = gatewayId ? `?gateway_id=${encodeURIComponent(gatewayId)}` : '';
    const rows = await apiRequest(`${branchPath(branchId)}/devices${query}`, { accessToken });
    return list(rows).map(normalizeDevice);
  },

  async getDevice({ branchId, deviceId, accessToken }) {
    const result = await apiRequest(devicePath(branchId, deviceId), { accessToken });
    return confirmed({
      ...normalizeDevice(result),
      readings: result.readings ?? undefined,
    }, 'No se pudo consultar el dispositivo.');
  },

  async getDeviceHealth({ branchId, deviceId, accessToken }) {
    return apiRequest(`${devicePath(branchId, deviceId)}/health`, { accessToken });
  },

  async requestSnapshot({ branchId, deviceId, accessToken }) {
    return apiRequest(`${devicePath(branchId, deviceId)}/snapshot/request`, {
      method: 'POST',
      accessToken,
      timeout: 20000,
    });
  },

  async fetchSnapshot({ branchId, deviceId, accessToken }) {
    const response = await fetch(`${API_BASE_URL}${devicePath(branchId, deviceId)}/snapshot`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new ApiError('No se pudo obtener la foto.', response.status);
    }
    const capturedAt = snapshotTimestamp(response.headers.get('X-Captured-At'));
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return {
      uri: `data:image/jpeg;base64,${base64}`,
      capturedAt,
      fingerprint: snapshotFingerprint(bytes),
    };
  },

  async updateDevice({ branchId, deviceId, name, location, accessToken }) {
    const result = await apiRequest(devicePath(branchId, deviceId), {
      method: 'PATCH',
      accessToken,
      body: { name, location },
    });
    return confirmed(normalizeDevice(result), 'Los cambios no fueron confirmados.');
  },

  async deleteDevice({ branchId, deviceId, force, accessToken }) {
    const query = force ? '?force=true' : '';
    const result = await apiRequest(`${devicePath(branchId, deviceId)}${query}`, {
      method: 'DELETE',
      accessToken,
      timeout: 70000,
    });
    return confirmed(result, 'La eliminación no fue confirmada.', (value) => value.deleted === true);
  },

  async getDeviceShelf({ branchId, deviceId, accessToken }) {
    const result = await apiRequest(`${devicePath(branchId, deviceId)}/shelf`, { accessToken });
    if (result == null) return null;
    if (result.shelf === undefined) return result;
    return result.shelf ?? null;
  },

  async linkShelf({ branchId, deviceId, shelfId, accessToken }) {
    const result = await apiRequest(`${devicePath(branchId, deviceId)}/shelf`, {
      method: 'PUT',
      accessToken,
      body: { shelf_id: shelfId },
    });
    return result?.shelf ?? result;
  },

  async createShelf({ branchId, deviceId, name, location, accessToken }) {
    const result = await apiRequest(`${devicePath(branchId, deviceId)}/shelf`, {
      method: 'POST',
      accessToken,
      body: { name, location_label: location ?? null },
    });
    return result?.shelf ?? result;
  },
  async updateShelf({ branchId, shelfId, name, location, accessToken }) {
    const result = await apiRequest(`${branchPath(branchId)}/shelves/${encodeURIComponent(shelfId)}`, {
      method: 'PATCH',
      accessToken,
      body: { name, location_label: location ?? null },
    });
    return result?.shelf ?? result;
  },

  async listRois({ branchId, shelfId, accessToken }) {
    return apiRequest(`${branchPath(branchId)}/shelves/${encodeURIComponent(shelfId)}/rois`, { accessToken });
  },

  async saveRois({ branchId, shelfId, baseVersion, rois, accessToken }) {
    return apiRequest(`${branchPath(branchId)}/shelves/${encodeURIComponent(shelfId)}/rois`, {
      method: 'PUT',
      accessToken,
      body: { base_version: baseVersion, rois },
    });
  },

  async applyRois({ branchId, shelfId, version, accessToken }) {
    return apiRequest(`${branchPath(branchId)}/shelves/${encodeURIComponent(shelfId)}/rois/apply`, {
      method: 'POST',
      accessToken,
      body: { version },
      timeout: 20000,
    });
  },

  async getGuide({ branchId, deviceId, accessToken }) {
    const result = await apiRequest(`${devicePath(branchId, deviceId)}/guide`, { accessToken });
    return confirmed({
      ...normalizeDevice(result),
      lights: list(result.lights).map(normalizeLight),
    }, 'No se pudo consultar la guía.');
  },

  async listLightChannels({ branchId, deviceId, accessToken }) {
    const rows = await apiRequest(`${devicePath(branchId, deviceId)}/light-channels`, { accessToken });
    return list(rows).map((channel) => ({
      id: channel.id,
      label: channel.label,
      available: channel.available === true,
    }));
  },

  async listShelves({ branchId, accessToken }) {
    const rows = await apiRequest(`${branchPath(branchId)}/shelves`, { accessToken });
    return list(rows).map((shelf) => ({
      id: shelf.id,
      name: shelf.name,
      location: shelf.location ?? null,
    }));
  },

  async listProducts({ branchId, accessToken }) {
    const rows = await apiRequest(`${branchPath(branchId)}/products?limit=100`, { accessToken });
    return list(rows).map(normalizeProduct);
  },

  async createProduct({ branchId, sku, name, accessToken }) {
    const result = await apiRequest(`${branchPath(branchId)}/products`, {
      method: 'POST',
      accessToken,
      body: { sku, name },
    });
    return confirmed(normalizeProduct(result), 'El producto no fue confirmado.');
  },

  async getGatewayStatus({ gatewayId, accessToken }) {
    const result = await apiRequest(`/gateways/${encodeURIComponent(gatewayId)}/commands`, {
      method: 'POST',
      accessToken,
      timeout: 70000,
      body: { command: 'status' },
    });
    return result;
  },

  async addLight({ branchId, deviceId, name, shelfId, channel, accessToken }) {
    const result = await apiRequest(`${devicePath(branchId, deviceId)}/lights`, {
      method: 'POST',
      accessToken,
      body: { name, shelf_id: shelfId, channel },
    });
    return confirmed(normalizeLight(result), 'La luz no fue confirmada.');
  },

  async updateLight({ branchId, deviceId, lightId, name, shelfId, channel, accessToken }) {
    const result = await apiRequest(
      `${devicePath(branchId, deviceId)}/lights/${encodeURIComponent(lightId)}`,
      { method: 'PATCH', accessToken, body: { name, shelf_id: shelfId, channel } });
    return confirmed(normalizeLight(result), 'Los cambios de la luz no fueron confirmados.');
  },

  async testLight({ branchId, deviceId, channel, durationSeconds, accessToken }) {
    const result = await apiRequest(`${devicePath(branchId, deviceId)}/lights/test`, {
      method: 'POST',
      accessToken,
      timeout: 70000,
      body: { channel, duration_seconds: durationSeconds },
    });
    if (result?.confirmed !== true) throw new ApiError('El gateway no confirmó la prueba.', 502);
    return { confirmed: true, channel: result.channel ?? channel };
  },
};
