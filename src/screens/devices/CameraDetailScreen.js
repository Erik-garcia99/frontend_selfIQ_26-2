import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Shell, ErrorNotice, Primary, Info, NavRow, useDevices } from './DeviceUI';
import { useAuth } from '../../context/AuthContext';
import { deviceAdapter } from '../../services/deviceAdapter';
import { colors as C } from '../../theme/colors';

function photoDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Fecha no disponible';
}

export default function CameraDetailScreen({ go }) {
  const d = useDevices();
  const { accessToken } = useAuth();
  return <CameraDetail key={`${d.branchId}:${d.device?.id}:${accessToken}`} go={go} d={d} accessToken={accessToken} />;
}

function CameraDetail({ go, d, accessToken }) {
  const [device, setDevice] = useState(d.device);
  const [checking, setChecking] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState('');
  const active = useRef(false);
  const requesting = useRef(false);
  const branchId = d.branchId;
  const deviceId = d.device?.id;

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    const params = { branchId, deviceId, accessToken };
    if (!branchId || !deviceId) return () => { active.current = false; };
    deviceAdapter.getDevice(params)
      .then(value => { if (!cancelled) setDevice(value); })
      .catch(() => { if (!cancelled) setConnectionError(true); })
      .finally(() => { if (!cancelled) setChecking(false); });
    deviceAdapter.fetchSnapshot(params)
      .then(value => { if (!cancelled) setSnapshot(value); })
      .catch(error => {
        if (!cancelled && error.status !== 404) setSnapshotError('No pudimos cargar la última foto. Intenta tomar una nueva.');
      })
      .finally(() => { if (!cancelled) setInitialLoading(false); });
    return () => { cancelled = true; active.current = false; };
  }, [branchId, deviceId, accessToken]);

  async function requestSnapshot() {
    if (requesting.current || !deviceId || !branchId) return;
    requesting.current = true;
    setSnapshotLoading(true);
    setSnapshotError('');
    const params = { branchId, deviceId, accessToken };
    try {
      await deviceAdapter.requestSnapshot(params);
      // La confirmación del comando precede al almacenamiento de la imagen.
      await new Promise(resolve => setTimeout(resolve, 8000));
      if (!active.current) return;
      const next = await deviceAdapter.fetchSnapshot(params);
      if (!active.current) return;
      if (!next.capturedAt || (snapshot?.capturedAt && new Date(next.capturedAt) <= new Date(snapshot.capturedAt))) {
        setSnapshotError('La foto nueva todavía no está disponible. Espera un momento y vuelve a intentarlo.');
      } else {
        setSnapshot(next);
      }
    } catch {
      if (active.current) setSnapshotError('No pudimos obtener una foto nueva. Comprueba que la cámara esté encendida y conectada a la red, e inténtalo de nuevo.');
    } finally {
      requesting.current = false;
      if (active.current) setSnapshotLoading(false);
    }
  }

  if (!deviceId || !branchId) return <Shell go={go} title="Cámara" back="registered-devices">
    <Info title="Selecciona una cámara">Vuelve a tus dispositivos y elige la cámara que quieres consultar.</Info>
  </Shell>;

  const online = checking || connectionError ? null : device?.online;
  const status = checking ? 'Consultando conexión…' : online === true ? 'Cámara conectada' : online === false ? 'Cámara desconectada' : 'Conexión sin confirmar';

  return <Shell go={go} title={device?.name || 'Cámara'} subtitle={device?.location || 'Sin ubicación asignada'} back="registered-devices">
    <View style={styles.status} accessibilityLiveRegion="polite">
      <View style={[styles.dot, { backgroundColor: online === true ? '#247443' : online === false ? C.danger : C.muted }]} />
      <Text style={styles.statusText}>{status}</Text>
    </View>
    {online === false && <Info>Revisa que la cámara esté encendida y conectada a la red. Puedes consultar la última foto guardada.</Info>}
    {!checking && online == null && <Info>No pudimos confirmar la conexión. Puedes intentar tomar una foto para comprobar si la cámara responde.</Info>}

    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.heading}>Vista de la repisa</Text>
      <Text style={styles.copy}>Toma una foto para comprobar qué está viendo la cámara.</Text>
      <View style={styles.preview}>
        {snapshot ? <Image source={{ uri: snapshot.uri }} accessibilityLabel="Última foto capturada por la cámara de la repisa" style={styles.image}
          onError={() => setSnapshotError('No pudimos mostrar esta foto. Intenta tomar una nueva.')} />
          : <View style={styles.empty}>
            {initialLoading ? <ActivityIndicator color={C.navy} /> : null}
            <Text style={styles.emptyTitle}>{initialLoading ? 'Buscando la última foto…' : 'Todavía no hay una foto para mostrar'}</Text>
            {!initialLoading && <Text style={styles.emptyCopy}>Usa el botón de abajo para ver la repisa.</Text>}
          </View>}
      </View>
      {snapshot && <Text style={styles.caption}>Última foto · {photoDate(snapshot.capturedAt)}</Text>}
      <Text style={styles.copy}>La imagen en blanco y negro es normal. Es una foto, no video en vivo.</Text>
      <ErrorNotice message={snapshotError} />
      {snapshotLoading && <View style={styles.progress} accessibilityLiveRegion="polite">
        <ActivityIndicator color={C.navy} />
        <Text style={styles.progressText}>La cámara está preparando la foto. Puede tardar unos segundos.</Text>
      </View>}
      <Primary onPress={requestSnapshot} loading={snapshotLoading} loadingLabel="Tomando foto…" disabled={initialLoading}>
        {snapshotError ? 'Reintentar foto' : snapshot ? 'Tomar nueva foto' : 'Tomar primera foto'}
      </Primary>
    </View>

    <NavRow label="Nombre y ubicación" detail="Cambiar los datos de esta cámara" onPress={() => { d.selectDevice(device); go('edit-device'); }} />
    <NavRow label="Eliminar cámara" danger onPress={() => { d.selectDevice(device); go('delete-device'); }} />
  </Shell>;
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: C.ink, fontSize: 15, fontWeight: '600', flex: 1 },
  card: { backgroundColor: C.field, borderRadius: 24, padding: 20, gap: 14 },
  heading: { color: C.ink, fontSize: 21, fontWeight: '700' },
  copy: { color: C.muted, fontSize: 14, lineHeight: 21 },
  preview: { backgroundColor: C.border, borderRadius: 16, overflow: 'hidden', aspectRatio: 4 / 3, justifyContent: 'center' },
  image: { width: '100%', height: '100%', resizeMode: 'contain' },
  empty: { padding: 20, alignItems: 'center', gap: 10 },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyCopy: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  caption: { color: C.text, fontSize: 13, lineHeight: 19 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressText: { color: C.text, fontSize: 14, lineHeight: 21, flex: 1 },
});
