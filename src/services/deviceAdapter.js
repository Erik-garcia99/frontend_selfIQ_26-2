// Adaptador real del contrato src/services/deviceService.js.
// Traduce las operaciones del panel a los endpoints de backend/app/devices.py
// y normaliza las respuestas. Nunca inventa confirmaciones.
import { apiRequest, ApiError } from './http';

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
    gatewayId: value.gatewayId ?? null,
  };
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

export const deviceAdapter = {
  async listGateways({ branchId, accessToken }) {
    const rows = await apiRequest('/gateways', { accessToken });
    return list(rows)
      .filter((gateway) => String(gateway.branch_id) === String(branchId))
      .map((gateway) => ({
        id: gateway.gateway_id,
        name: gateway.name || gateway.gateway_id,
        online: gateway.connected === true,
      }));
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

  async listDevices({ branchId, accessToken }) {
    const rows = await apiRequest(`${branchPath(branchId)}/devices`, { accessToken });
    return list(rows).map(normalizeDevice);
  },

  async getDevice({ branchId, deviceId, accessToken }) {
    const result = await apiRequest(devicePath(branchId, deviceId), { accessToken });
    return confirmed({
      ...normalizeDevice(result),
      readings: result.readings ?? undefined,
    }, 'No se pudo consultar el dispositivo.');
  },

  async updateDevice({ branchId, deviceId, name, location, accessToken }) {
    const result = await apiRequest(devicePath(branchId, deviceId), {
      method: 'PATCH',
      accessToken,
      body: { name, location },
    });
    return confirmed(normalizeDevice(result), 'Los cambios no fueron confirmados.');
  },

  async deleteDevice({ branchId, deviceId, accessToken }) {
    const result = await apiRequest(devicePath(branchId, deviceId), {
      method: 'DELETE',
      accessToken,
    });
    return confirmed(result, 'La eliminación no fue confirmada.', (value) => value.deleted === true);
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
    if (result?.confirmed !== true) throw new ApiError('La Raspberry no confirmó la prueba.', 502);
    return { confirmed: true, channel: result.channel ?? channel };
  },
};
