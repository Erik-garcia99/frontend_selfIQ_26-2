import { Shell, Copy, ErrorNotice, Wait, LoadState, useData, useSave, useDevices, FieldCard, Primary, Info, NavRow, SectionLabel, deviceLabel, statusLabel, LIGHT_LIMIT } from './DeviceUI';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { deviceAdapter } from '../../services/deviceAdapter';
import { Image } from 'react-native';

export default function CameraDetailScreen({ go }) {
  const d = useDevices();
  const { accessToken } = useAuth();
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // Snapshot state
  const [snapshotUri, setSnapshotUri] = useState(null);
  const [snapshotTime, setSnapshotTime] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState(null);

  useEffect(() => {
    if (!d.device?.id || !d.branchId) return;
    let cancelled = false;
    setLoadingHealth(true);
    setHealthError(null);
    (async () => {
      try {
        const h = await deviceAdapter.getDeviceHealth({ branchId: d.branchId, deviceId: d.device.id, accessToken });
        if (!cancelled) setHealth(h);
      } catch (e) {
        if (!cancelled) setHealthError(e?.message || 'No se pudo consultar la salud');
      } finally {
        if (!cancelled) setLoadingHealth(false);
      }
    })();
    return () => { cancelled = true; };
  }, [d.device?.id, d.branchId, accessToken]);

  const requestSnapshot = async () => {
    if (!d.device?.id || !d.branchId) return;
    setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      await deviceAdapter.requestSnapshot({ branchId: d.branchId, deviceId: d.device.id, accessToken });
      // Esperar a que el ESP envíe la imagen (max ~12 s)
      await new Promise((r) => setTimeout(r, 8000));
      const snap = await deviceAdapter.fetchSnapshot({ branchId: d.branchId, deviceId: d.device.id, accessToken });
      setSnapshotUri(snap.uri);
      setSnapshotTime(snap.capturedAt);
    } catch (e) {
      setSnapshotError(e?.message || 'No se pudo obtener la foto');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const profileLabel = (p) => ({ 0: 'Normal', 1: 'Alto', 2: 'Bajo', 3: 'Muy bajo' }[p] ?? '—');

  return <Shell go={go} title={deviceLabel(d.device)} back="registered-devices">
    <Info title={statusLabel(d.device)}>Salud y análisis de la cámara.</Info>
    <FieldCard label="Nombre" value={d.device?.name} />
    <FieldCard label="Ubicación" value={d.device?.location} />
    <SectionLabel>Salud del nodo</SectionLabel>
    {loadingHealth && <Wait>Cargando salud…</Wait>}
    {healthError && <ErrorNotice>{healthError}</ErrorNotice>}
    {health && <>
      <FieldCard label="FPS" value={health.fps != null ? health.fps.toFixed(1) : '—'} />
      <FieldCard label="Heap libre" value={health.heap != null ? `${health.heap} B` : '—'} />
      <FieldCard label="Fallos acumulados" value={health.fails != null ? health.fails : '—'} />
      <FieldCard label="Uptime" value={health.uptime_s != null ? `${health.uptime_s} s` : '—'} />
      <FieldCard label="Perfil de análisis" value={profileLabel(health.profile)} />
      <FieldCard label="Última lectura" value={health.measured_at ?? '—'} />
      <FieldCard label="Estado" value={health.status ?? '—'} />
    </>}
    <SectionLabel>Foto actual</SectionLabel>
    {snapshotLoading && <Wait>Obteniendo foto…</Wait>}
    {snapshotError && <ErrorNotice>{snapshotError}</ErrorNotice>}
    {snapshotUri && (
      <>
        <Image source={{ uri: snapshotUri }} style={{ width: '100%', height: 240, resizeMode: 'contain' }} />
        {snapshotTime && <FieldCard label="Capturada" value={snapshotTime} />}
      </>
    )}
    <Primary disabled={!d.device?.id || snapshotLoading} onPress={requestSnapshot}>
      {snapshotLoading ? 'Obteniendo…' : 'Ver foto actual'}
    </Primary>
    <Primary disabled={!d.device?.id} onPress={() => { d.selectDevice(d.device); go('edit-device'); }}>Editar datos</Primary>
    <Primary variant="danger" disabled={!d.device?.id} onPress={() => { d.selectDevice(d.device); go('delete-device'); }}>Eliminar dispositivo</Primary>
  </Shell>;
}