import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Shell, ErrorNotice, Primary, Info, SectionLabel, Copy, useDevices, deviceLabel } from './DeviceUI';
import { useAuth } from '../../context/AuthContext';
import { deviceAdapter } from '../../services/deviceAdapter';
import { describeError } from '../../utils/errorMessages';
import { colors as C } from '../../theme/colors';

const TYPE_LABELS = {
  camera: 'Cámara de repisa',
  guide: 'Guía de luces',
  occupancy: 'Control de aforo',
  environment: 'Sensor ambiental',
};

function dateLabel(value) {
  if (!value) return 'Sin dato';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin dato' : date.toLocaleString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function valueLabel(value, suffix = '') {
  return value === null || value === undefined || value === '' ? 'Sin dato' : `${value}${suffix}`;
}

function TechnicalRow({ label, value }) {
  return <View style={styles.dataRow}>
    <Text style={styles.dataLabel}>{label}</Text>
    <Text style={styles.dataValue} selectable>{value}</Text>
  </View>;
}

function HealthCard({ health }) {
  if (!health) return null;
  const statusText = health.status === 'ok' ? 'Datos recientes'
    : health.status === 'stale' ? 'Datos antiguos' : 'Sin datos';
  return <View style={styles.card}>
    <TechnicalRow label="Estado de los datos" value={statusText} />
    <TechnicalRow label="FPS detectados" value={valueLabel(health.fps)} />
    <TechnicalRow label="Heap libre" value={health.heap == null ? 'Sin dato' : `${health.heap} bytes`} />
    <TechnicalRow label="Fallos" value={valueLabel(health.fails)} />
    <TechnicalRow label="Tiempo encendido" value={health.uptime_s == null ? 'Sin dato' : `${Math.floor(health.uptime_s / 3600)} h ${Math.floor((health.uptime_s % 3600) / 60)} min`} />
    <TechnicalRow label="Perfil activo" value={valueLabel(health.profile)} />
    <TechnicalRow label="Medición" value={dateLabel(health.measured_at)} />
    <TechnicalRow label="Antigüedad" value={health.age_seconds == null ? 'Sin dato' : `${health.age_seconds} s`} />
  </View>;
}

function GatewayCard({ status }) {
  const data = status?.data || {};
  return <View style={styles.card}>
    <TechnicalRow label="Comando confirmado" value={status?.ok === true ? 'Sí' : 'No'} />
    {status?.error ? <TechnicalRow label="Error" value={String(status.error)} /> : null}
    {Object.entries(data).map(([key, value]) => (
      <TechnicalRow key={key} label={key} value={typeof value === 'object' && value !== null ? JSON.stringify(value) : valueLabel(value)} />
    ))}
  </View>;
}

export default function DiagnosticsScreen({ go }) {
  const d = useDevices();
  const { accessToken } = useAuth();
  const device = d.device;
  const [health, setHealth] = useState(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthError, setHealthError] = useState('');
  const [status, setStatus] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState('');

  if (!device?.id || !d.branchId) return <Shell go={go} title="Diagnóstico técnico" back="camera-detail">
    <Info title="Selecciona un dispositivo">Vuelve a la ficha del dispositivo para consultar sus datos técnicos.</Info>
  </Shell>;

  async function loadHealth() {
    if (healthBusy) return;
    setHealthBusy(true); setHealthError('');
    try {
      setHealth(await deviceAdapter.getDeviceHealth({ branchId: d.branchId, deviceId: device.id, accessToken }));
    } catch (failure) {
      setHealthError(describeError(failure).message);
    } finally { setHealthBusy(false); }
  }

  async function loadStatus() {
    if (statusBusy || !device.gatewayId) return;
    setStatusBusy(true); setStatusError('');
    try {
      setStatus(await deviceAdapter.getGatewayStatus({ gatewayId: device.gatewayId, accessToken }));
    } catch (failure) {
      setStatusError(describeError(failure).message);
    } finally { setStatusBusy(false); }
  }

  return <Shell go={go} title="Diagnóstico técnico" subtitle={device.name || deviceLabel(device)} back="camera-detail">
    <Info title="Uso interno">
      Estos datos son técnicos y sirven para revisar el funcionamiento del dispositivo durante una inspección.
    </Info>

    <SectionLabel>Identidad y red</SectionLabel>
    <View style={styles.card}>
      <TechnicalRow label="Tipo" value={TYPE_LABELS[device.type] || valueLabel(device.type)} />
      <TechnicalRow label="Nombre" value={valueLabel(device.name)} />
      <TechnicalRow label="Ubicación" value={valueLabel(device.location)} />
      <TechnicalRow label="MAC" value={valueLabel(device.macAddress)} />
      <TechnicalRow label="Código de nodo" value={valueLabel(device.nodeCode)} />
      <TechnicalRow label="Gateway" value={valueLabel(device.gatewayName || device.gatewayId)} />
      <TechnicalRow label="Firmware" value={valueLabel(device.firmwareVersion)} />
      <TechnicalRow label="Dirección IP" value={valueLabel(device.ipAddress)} />
      <TechnicalRow label="Señal Wi-Fi" value={device.wifiRssi == null ? 'Sin dato' : `${device.wifiRssi} dBm`} />
      <TechnicalRow label="Batería" value={device.batteryLevelPct == null ? 'No aplica' : `${device.batteryLevelPct}%`} />
      <TechnicalRow label="Alimentación" value={valueLabel(device.powerSource)} />
      <TechnicalRow label="Último contacto" value={dateLabel(device.lastSeenAt)} />
      <TechnicalRow label="Registrado" value={dateLabel(device.registeredAt)} />
    </View>

    <SectionLabel>Salud de la cámara</SectionLabel>
    <Copy>Consulta en InfluxDB las métricas que reporta la ESP32-CAM (FPS, memoria, fallos y tiempo encendido).</Copy>
    {healthError ? <ErrorNotice message={healthError} /> : null}
    <Primary variant="light" loading={healthBusy} loadingLabel="Consultando…" disabled={healthBusy} onPress={loadHealth}>
      {health ? 'Actualizar salud' : 'Consultar salud'}
    </Primary>
    <HealthCard health={health} />

    <SectionLabel>Estado de la RPi</SectionLabel>
    <Copy>Solicita al gateway el estado en vivo: conexión Wi-Fi, backend, túnel TCP, registro y cola de mensajes.</Copy>
    {statusError ? <ErrorNotice message={statusError} /> : null}
    <Primary variant="light" loading={statusBusy} loadingLabel="Consultando RPi…" disabled={statusBusy || !device.gatewayId} onPress={loadStatus}>
      {status ? 'Actualizar estado de la RPi' : 'Consultar estado de la RPi'}
    </Primary>
    {!device.gatewayId ? <Info>El gateway de este dispositivo no está identificado.</Info> : null}
    <GatewayCard status={status} />
    {status && status.ok !== true ? <Info>La RPi no confirmó el comando. Puede estar desconectada o sin sesión activa.</Info> : null}

    <SectionLabel>Logs para inspección</SectionLabel>
    <Info title="En la Raspberry Pi">Conéctate por SSH y consulta el servicio selfiq:</Info>
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <Text selectable style={styles.codeBlock}>{'sudo journalctl -u selfiq -n 100 --no-pager'}</Text>
    </ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <Text selectable style={styles.codeBlock}>{'sudo journalctl -u selfiq -f'}</Text>
    </ScrollView>
    <Info title="En el backend">
      Los logs del servicio desplegado (Railway) están disponibles desde el panel del proyecto. Ahí se ven los errores de registro, ROI y comandos.
    </Info>
    <Copy>El primer comando muestra las últimas 100 líneas; el segundo sigue los logs en vivo. Usa Ctrl+C para salir del seguimiento.</Copy>
  </Shell>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 14 },
  dataRow: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  dataLabel: { color: C.muted, fontSize: 11, fontWeight: '500', marginBottom: 3 },
  dataValue: { color: C.ink, fontSize: 14, fontWeight: '500' },
  codeBlock: { fontFamily: 'monospace', fontSize: 12, color: C.ink, backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
});
