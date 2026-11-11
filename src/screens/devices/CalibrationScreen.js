import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Shell, ErrorNotice, Primary, Info, NavRow, SectionLabel, useDevices } from './DeviceUI';
import { useAuth } from '../../context/AuthContext';
import { deviceAdapter } from '../../services/deviceAdapter';
import { calibrationService } from '../../services/calibrationService.js';
import { newClientId, nextAction, sessionStateLabel, kindLabel, calibrationErrorText } from '../../utils/calibration.js';
import { colors as C } from '../../theme/colors';

const REFERENCES = [
  { kind: 'empty', title: 'Zona vacía', detail: 'Retira todo el producto de esta zona.' },
  { kind: 'full', title: 'Zona abastecida', detail: 'Repón la zona con el acomodo habitual.' },
];

function friendlyError(failure, fallback) {
  return calibrationErrorText(failure) || fallback;
}

export default function CalibrationScreen({ go }) {
  const d = useDevices();
  const { accessToken } = useAuth();
  const device = d.device;
  const branchId = d.branchId;
  const deviceId = device?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shelf, setShelf] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedId, setSelectedId] = useState(d.zone?.id || null);
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [images, setImages] = useState({});
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    if (!branchId || !deviceId) return;
    setLoading(true);
    setError('');
    try {
      const shelfValue = await deviceAdapter.getDeviceShelf({ branchId, deviceId, accessToken });
      setShelf(shelfValue);
      if (!shelfValue) return;
      const roiData = await deviceAdapter.listRois({ branchId, shelfId: shelfValue.id, accessToken });
      setZones((roiData?.rois || []).map((roi) => ({
        id: roi.id,
        name: roi.name || '',
        productId: roi.productId ?? roi.product_id ?? null,
        productName: roi.product_name ?? null,
        productSku: roi.product_sku ?? null,
      })));
    } catch (failure) {
      setError(friendlyError(failure, 'No pudimos cargar las zonas de esta cámara.'));
    } finally {
      setLoading(false);
    }
  }, [branchId, deviceId, accessToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (!branchId || !selectedId || !accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const { items } = await calibrationService.listSessions({ branchId, roiId: selectedId, accessToken, limit: 5 });
        const open = (items || []).find((s) => ['draft', 'empty_ready', 'pair_ready', 'committing', 'cancel_pending'].includes(s.state));
        if (!cancelled && open) {
          const full = await calibrationService.getSession({ branchId, roiId: selectedId, calibrationId: open.id, accessToken });
          if (!cancelled) setSession(full);
        }
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [branchId, selectedId, accessToken]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const selected = zones.find((zone) => zone.id === selectedId) || null;
  const action = nextAction(session);

  useEffect(() => {
    if (!session?.references?.length || !branchId || !accessToken) return;
    let cancelled = false;
    (async () => {
      const next = {};
      for (const ref of session.references) {
        if (!ref.imageId || images[ref.captureId]) continue;
        try {
          const img = await calibrationService.fetchImage({ branchId, snapshotId: ref.imageId, accessToken });
          if (!cancelled) next[ref.captureId] = img.uri;
        } catch (e) { /* ignore */ }
      }
      if (!cancelled && Object.keys(next).length) setImages((prev) => ({ ...prev, ...next }));
    })();
    return () => { cancelled = true; };
  }, [session, branchId, accessToken]);

  const refreshSession = useCallback(async (calibrationId) => {
    if (!branchId || !selectedId || !calibrationId) return;
    const next = await calibrationService.getSession({ branchId, roiId: selectedId, calibrationId, accessToken });
    setSession(next);
    return next;
  }, [branchId, selectedId, accessToken]);

  const startPolling = (calibrationId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const next = await refreshSession(calibrationId);
        if (next && ['empty_ready', 'pair_ready', 'active', 'cancelled', 'failed'].includes(next.state)) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (_e) { /* ignore transient */ }
    }, 2000);
  };

  const createSession = async () => {
    if (!selected) return;
    setBusy(true); setError(''); setStatus('Creando sesión…');
    try {
      const s = await calibrationService.createSession({ branchId, roiId: selected.id, accessToken, idempotencyKey: newClientId() });
      setSession(s);
      setStatus('');
    } catch (failure) {
      setError(friendlyError(failure, 'No pudimos iniciar la calibración.'));
    } finally { setBusy(false); }
  };

  const capture = async (kind) => {
    if (!session) return;
    setBusy(true); setError(''); setStatus(`Solicitando captura ${kindLabel(kind)}…`);
    try {
      const op = await calibrationService.capture({ branchId, roiId: selected.id, calibrationId: session.id, kind, captureId: newClientId(), sessionVersion: session.sessionVersion, accessToken, idempotencyKey: newClientId() });
      setStatus('Esperando confirmación de la cámara…');
      startPolling(session.id);
    } catch (failure) {
      setError(friendlyError(failure, 'No pudimos solicitar la captura.'));
    } finally { setBusy(false); }
  };

  const commit = async () => {
    if (!session) return;
    const refs = {};
    const lastOf = (kind) => (session.references || []).filter((r) => r.kind === kind).slice(-1)[0];
    const emptyRef = lastOf('empty');
    const fullRef = lastOf('full');
    if (!emptyRef?.captureId || !fullRef?.captureId) {
      setError('Faltan las dos referencias.'); return;
    }
    refs.empty = { captureId: emptyRef.captureId };
    refs.full = { captureId: fullRef.captureId };
    setBusy(true); setError(''); setStatus('Confirmando calibración…');
    try {
      await calibrationService.commit({ branchId, roiId: selected.id, calibrationId: session.id, sessionVersion: session.sessionVersion, references: refs, accessToken, idempotencyKey: newClientId() });
      await refreshSession(session.id);
      setStatus('Calibración guardada.');
    } catch (failure) {
      setError(friendlyError(failure, 'No pudimos confirmar la calibración.'));
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!session) return;
    setBusy(true); setError(''); setStatus('Cancelando…');
    try {
      await calibrationService.cancel({ branchId, roiId: selected.id, calibrationId: session.id, sessionVersion: session.sessionVersion, accessToken, idempotencyKey: newClientId() });
      await refreshSession(session.id);
    } catch (failure) {
      setError(friendlyError(failure, 'No pudimos cancelar.'));
    } finally { setBusy(false); }
  };

  if (!deviceId || !branchId) return <Shell go={go} title="Preparar zona" back="camera-detail">
    <Info title="Selecciona una cámara">Vuelve a tus dispositivos y elige la cámara que quieres calibrar.</Info>
  </Shell>;

  if (loading) return <Shell go={go} title="Preparar zona" back="camera-detail">
    <View style={styles.center}><ActivityIndicator color={C.navy} /><Text style={styles.muted}>Cargando zonas…</Text></View>
  </Shell>;

  if (!shelf) return <Shell go={go} title="Preparar zona" back="camera-detail">
    <Info title="Esta cámara no tiene repisa asignada">Primero crea la repisa y marca sus zonas.</Info>
    <Primary onPress={() => { d.selectDevice(device); go('shelf-zones'); }}>Configurar zonas</Primary>
  </Shell>;

  return <Shell go={go} title="Preparar zona" subtitle={shelf?.name ? `Repisa: ${shelf.name}` : undefined} back="camera-detail">
    <ErrorNotice message={error} />
    {status ? <Text style={styles.status}>{status}</Text> : null}

    {zones.length === 0 ? <>
      <Info title="Todavía no hay zonas">Marca sobre una foto las áreas del estante que quieres monitorear.</Info>
      <Primary onPress={() => { d.selectDevice(device); go('shelf-zones'); }}>Configurar zonas</Primary>
    </> : <>
      <SectionLabel>1. Elige la zona</SectionLabel>
      <View style={styles.zoneList}>
        {zones.map((zone) => {
          const active = zone.id === selectedId;
          return <TouchableOpacity key={zone.id} accessibilityRole="button" accessibilityState={{ selected: active }}
            onPress={() => { setSelectedId(zone.id); setSession(null); }}
            style={[styles.zoneRow, active && styles.zoneRowActive]}>
            <View style={styles.zoneInfo}>
              <Text style={styles.zoneName} numberOfLines={1}>{zone.productName || zone.name || 'Zona sin producto'}</Text>
              <Text style={styles.zoneDetail} numberOfLines={1}>{zone.productSku ? `SKU ${zone.productSku}` : 'Sin producto asignado'}</Text>
            </View>
            {active ? <Text style={styles.zoneCheck}>✓</Text> : null}
          </TouchableOpacity>;
        })}
      </View>

      {selected && !session && <>
        <Info title="Antes de empezar">Mantén la cámara fija, iluminación habitual y retira las manos antes de cada captura.</Info>
        <Primary onPress={createSession} disabled={busy}>Comenzar calibración</Primary>
      </>}

      {session && <>
        <SectionLabel>Estado: {sessionStateLabel(session.state)}</SectionLabel>
        {session.product?.name ? <Text style={styles.muted}>Producto: {session.product.name}</Text> : null}

        {action === 'capture_empty' && <Primary onPress={() => capture('empty')} disabled={busy}>Capturar zona vacía</Primary>}
        {action === 'capture_full' && <Primary onPress={() => capture('full')} disabled={busy}>Capturar zona abastecida</Primary>}
        {action === 'wait_capture' && <View style={styles.center}><ActivityIndicator color={C.navy} /><Text style={styles.muted}>Esperando a la cámara…</Text></View>}
        {action === 'review_commit' && <>
          <Info title="Revisa las dos referencias">Si ambas capturas son correctas, guarda la calibración.</Info>
          <View style={styles.imgRow}>
            {session.references.map((ref) => (
              <View key={ref.captureId} style={styles.imgBox}>
                <Text style={styles.muted}>{kindLabel(ref.kind)}</Text>
                {images[ref.captureId] ? <Image source={{ uri: images[ref.captureId] }} style={styles.img} /> : <Text style={styles.muted}>Sin imagen</Text>}
              </View>
            ))}
          </View>
          <Primary onPress={commit} disabled={busy}>Guardar calibración</Primary>
        </>}
        {action === 'done' && <Info title="Calibración guardada">Esta zona ya tiene una calibración activa.</Info>}
        {(action === 'closed' || action === 'unknown') && <Info title="Sesión cerrada">Inicia una nueva calibración.</Info>}

        {session.references?.length ? <View style={styles.refs}>
          {session.references.map((ref, idx) => <Text key={idx} style={styles.muted}>{kindLabel(ref.kind)}: {ref.status}</Text>)}
        </View> : null}

        {session.state !== 'active' && session.state !== 'cancelled' && (
          <TouchableOpacity onPress={cancel} disabled={busy} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </>}

      <NavRow label="Cambiar zonas o producto" detail="Ajusta el área marcada o el producto" onPress={() => { d.selectDevice(device); go('shelf-zones'); }} />
    </>}
  </Shell>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 10, padding: 20 },
  muted: { color: C.muted, fontSize: 14, lineHeight: 21 },
  status: { color: C.navy, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  zoneList: { gap: 10 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.field, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 2, borderColor: 'transparent' },
  zoneRowActive: { borderColor: C.navy },
  zoneInfo: { flex: 1, gap: 4 },
  zoneName: { color: C.ink, fontSize: 16, fontWeight: '600' },
  zoneDetail: { color: C.muted, fontSize: 13 },
  zoneCheck: { color: C.navy, fontSize: 18, fontWeight: '700' },
  refs: { gap: 4, marginTop: 8 },
  imgRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  imgBox: { flex: 1, gap: 6 },
  img: { width: '100%', height: 120, borderRadius: 12, backgroundColor: C.field },
  cancelBtn: { marginTop: 12, alignSelf: 'flex-start' },
  cancelText: { color: C.muted, fontSize: 14, textDecorationLine: 'underline' },
});