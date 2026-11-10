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

function cameraMessage(kind = 'photo') {
  if (kind === 'timeout') {
    return 'La foto está tardando más de lo normal. Inténtalo de nuevo en unos segundos.';
  }
  if (kind === 'display') {
    return 'No pudimos mostrar esta foto. Intenta tomar una nueva.';
  }
  return 'No pudimos comunicarnos con la cámara. Verifica que esté encendida e inténtalo de nuevo.';
}

export default function CameraDetailScreen({ go }) {
  const d = useDevices();
  const { accessToken } = useAuth();
  return <CameraDetail key={`${d.branchId}:${d.device?.id}:${accessToken}`} go={go} d={d} accessToken={accessToken} />;
}

function CameraDetail({ go, d, accessToken }) {
  const device = d.device;
  const [snapshot, setSnapshot] = useState(null);
  const [shelf, setShelf] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState('');
  const active = useRef(false);
  const requesting = useRef(false);
  const branchId = d.branchId;
  const deviceId = device?.id;

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    if (!branchId || !deviceId) return () => { active.current = false; };

    deviceAdapter.getDeviceShelf({ branchId, deviceId, accessToken })
      .then(value => { if (!cancelled) setShelf(value); })
      .catch(() => { if (!cancelled) setShelf(null); });

    deviceAdapter.fetchSnapshot({ branchId, deviceId, accessToken })
      .then(value => { if (!cancelled) setSnapshot(value); })
      .catch(error => {
        if (!cancelled && error.status !== 404) setSnapshotError('No pudimos cargar la última foto. Puedes intentar tomar una nueva.');
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
      const deadline = Date.now() + 40000;

      while (active.current && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        if (!active.current) return;

        let next;
        try {
          next = await deviceAdapter.fetchSnapshot(params);
        } catch (failure) {
          if (failure.status === 404) continue;
          throw failure;
        }

        if (!active.current) return;
        const sameFingerprint = Boolean(next.fingerprint) && next.fingerprint === (snapshot?.fingerprint || '');
        const sameTimestamp = Boolean(next.capturedAt) && next.capturedAt === (snapshot?.capturedAt || '');

        if (!sameFingerprint || !sameTimestamp) {
          setSnapshot(next);
          return;
        }
      }

      if (active.current) setSnapshotError(cameraMessage('timeout'));
    } catch {
      if (active.current) setSnapshotError(cameraMessage());
    } finally {
      requesting.current = false;
      if (active.current) setSnapshotLoading(false);
    }
  }

  if (!deviceId || !branchId) return <Shell go={go} title="Cámara" back="registered-devices">
    <Info title="Selecciona una cámara">Vuelve a tus dispositivos y elige la cámara que quieres consultar.</Info>
  </Shell>;

  return <Shell go={go} title={device?.name || 'Cámara'} subtitle={shelf?.name ? `Repisa: ${shelf.name}` : undefined} back="registered-devices">
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text accessibilityRole="header" style={styles.heading}>Vista del estante</Text>
        <Text style={styles.copy}>Consulta la última foto o toma una nueva cuando la necesites.</Text>
      </View>

      <View style={styles.preview}>
        {snapshot ? <Image
          key={snapshot.fingerprint || 'snapshot'}
          source={{ uri: snapshot.uri }}
          accessibilityLabel="Última foto del estante"
          style={styles.image}
          onError={() => setSnapshotError(cameraMessage('display'))}
        /> : <View style={styles.empty}>
          {initialLoading ? <ActivityIndicator color={C.navy} /> : null}
          <Text style={styles.emptyTitle}>{initialLoading ? 'Cargando foto…' : 'Aún no hay una foto'}</Text>
          {!initialLoading && <Text style={styles.emptyCopy}>Toma una foto para ver el estante.</Text>}
        </View>}
      </View>

      {snapshot && <Text style={styles.caption}>Última foto · {photoDate(snapshot.capturedAt)}</Text>}
      <ErrorNotice message={snapshotError} />

      {snapshotLoading && <View style={styles.progress} accessibilityLiveRegion="polite">
        <ActivityIndicator color={C.navy} />
        <Text style={styles.progressText}>Preparando la foto…</Text>
      </View>}

      <Primary onPress={requestSnapshot} loading={snapshotLoading} loadingLabel="Tomando foto…" disabled={initialLoading}>
        {snapshot ? 'Tomar nueva foto' : 'Tomar foto'}
      </Primary>
    </View>

    <NavRow
      label="Preparar zona"
      detail="Captura la zona vacía y abastecida para que la cámara pueda medirla"
      onPress={() => { d.selectDevice(device); go('calibration'); }}
    />
    <NavRow
      label="Configurar zonas"
      detail="Marca las áreas del estante que quieres monitorear"
      onPress={() => { d.selectDevice(device); go('shelf-zones'); }}
    />
    <NavRow
      label="Nombre y ubicación"
      detail="Cambia cómo identificas esta cámara"
      onPress={() => { d.selectDevice(device); go('edit-device'); }}
    />
    <NavRow label="Eliminar cámara" danger onPress={() => { d.selectDevice(device); go('delete-device'); }} />
  </Shell>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.field, borderRadius: 24, padding: 20, gap: 14 },
  cardHeader: { gap: 6 },
  heading: { color: C.ink, fontSize: 21, fontWeight: '700' },
  copy: { color: C.muted, fontSize: 14, lineHeight: 20 },
  preview: { backgroundColor: C.border, borderRadius: 16, overflow: 'hidden', aspectRatio: 4 / 3, justifyContent: 'center' },
  image: { width: '100%', height: '100%', resizeMode: 'contain' },
  empty: { padding: 20, alignItems: 'center', gap: 8 },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyCopy: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  caption: { color: C.muted, fontSize: 13 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { color: C.text, fontSize: 14, flex: 1 },
});
