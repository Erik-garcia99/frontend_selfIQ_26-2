import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Shell, ErrorNotice, Primary, Info, NavRow, SectionLabel, useDevices } from './DeviceUI';
import { useAuth } from '../../context/AuthContext';
import { deviceAdapter } from '../../services/deviceAdapter';
import { colors as C } from '../../theme/colors';

// Referencias que la cámara necesita para medir una zona. El vocabulario de
// transporte es empty/full; en pantalla siempre hablamos de vacía/abastecida.
const REFERENCES = [
  {
    kind: 'empty',
    title: 'Zona vacía',
    detail: 'Retira todo el producto de esta zona. Debe verse como cuando el inventario se agota.',
  },
  {
    kind: 'full',
    title: 'Zona abastecida',
    detail: 'Repón la zona con el acomodo habitual. No hace falta llenarla de más.',
  },
];

function friendlyError(failure, fallback) {
  const status = Number(failure?.status ?? 0);
  if (status === 401 || status === 403) return 'No tienes permiso para preparar esta zona. Consulta con un administrador.';
  if (status === 404) return 'No encontramos la cámara o la repisa. Vuelve a la lista de dispositivos y ábrela de nuevo.';
  if (status === 408 || status === 502 || status === 503 || status === 504) return 'No pudimos comunicarnos con la cámara. Verifica que esté encendida e inténtalo de nuevo.';
  if (status === 0) return 'No pudimos comunicarnos con el sistema. Revisa tu conexión e inténtalo de nuevo.';
  return fallback;
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
      setError(friendlyError(failure, 'No pudimos cargar las zonas de esta cámara. Inténtalo de nuevo.'));
    } finally {
      setLoading(false);
    }
  }, [branchId, deviceId, accessToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const selected = zones.find((zone) => zone.id === selectedId) || null;

  if (!deviceId || !branchId) return <Shell go={go} title="Preparar zona" back="camera-detail">
    <Info title="Selecciona una cámara">Vuelve a tus dispositivos y elige la cámara que quieres calibrar.</Info>
  </Shell>;

  if (loading) return <Shell go={go} title="Preparar zona" back="camera-detail">
    <View style={styles.center}><ActivityIndicator color={C.navy} /><Text style={styles.muted}>Cargando zonas…</Text></View>
  </Shell>;

  if (!shelf) return <Shell go={go} title="Preparar zona" back="camera-detail">
    <Info title="Esta cámara no tiene repisa asignada">
      Primero crea la repisa y marca sus zonas. Después podrás preparar cada una para medirla.
    </Info>
    <Primary onPress={() => { d.selectDevice(device); go('shelf-zones'); }}>Configurar zonas</Primary>
  </Shell>;

  return <Shell go={go} title="Preparar zona" subtitle={shelf?.name ? `Repisa: ${shelf.name}` : undefined} back="camera-detail">
    <ErrorNotice message={error} />

    <Info title="Antes de empezar">
      Mantén la cámara fija y no muevas el encuadre. Usa la iluminación habitual de la tienda y retira las manos antes de cada captura.
    </Info>

    {zones.length === 0 ? <>
      <Info title="Todavía no hay zonas">
        Marca sobre una foto las áreas del estante que quieres monitorear. Cada zona necesita un producto.
      </Info>
      <Primary onPress={() => { d.selectDevice(device); go('shelf-zones'); }}>Configurar zonas</Primary>
    </> : <>
      <SectionLabel>1. Elige la zona</SectionLabel>
      <View style={styles.zoneList}>
        {zones.map((zone) => {
          const active = zone.id === selectedId;
          return <TouchableOpacity
            key={zone.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => setSelectedId(zone.id)}
            style={[styles.zoneRow, active && styles.zoneRowActive]}
          >
            <View style={styles.zoneInfo}>
              <Text style={styles.zoneName} numberOfLines={1}>{zone.productName || zone.name || 'Zona sin producto'}</Text>
              <Text style={styles.zoneDetail} numberOfLines={1}>
                {zone.productSku ? `SKU ${zone.productSku}` : 'Sin producto asignado'}
              </Text>
            </View>
            {active ? <Text style={styles.zoneCheck}>✓</Text> : null}
          </TouchableOpacity>;
        })}
      </View>

      {!selected ? <Info title="Elige una zona">
        Selecciona arriba la zona que vas a vaciar y abastecer. Solo se calibra esa zona; no hace falta vaciar toda la repisa.
      </Info> : <>
        <SectionLabel>2. Captura las dos referencias</SectionLabel>
        {REFERENCES.map((reference, index) => <View key={reference.kind} style={styles.step}>
          <Text style={styles.stepTitle}>{index + 1}. {reference.title}</Text>
          <Text style={styles.stepDetail}>{reference.detail}</Text>
          <Text style={styles.stepStatus}>Pendiente</Text>
        </View>)}

        <Info title="Todavía no disponible">
          El servicio de calibración aún no está conectado. Cuando lo esté, aquí capturarás las dos referencias, las revisarás y verás la fecha de la última calibración de la zona.
        </Info>
        <Primary disabled>Comenzar captura</Primary>
      </>}

      <NavRow
        label="Cambiar zonas o producto"
        detail="Ajusta el área marcada o el producto de esta cámara"
        onPress={() => { d.selectDevice(device); go('shelf-zones'); }}
      />
    </>}
  </Shell>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 10, padding: 20 },
  muted: { color: C.muted, fontSize: 14, lineHeight: 21 },
  zoneList: { gap: 10 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.field, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 2, borderColor: 'transparent' },
  zoneRowActive: { borderColor: C.navy },
  zoneInfo: { flex: 1, gap: 4 },
  zoneName: { color: C.ink, fontSize: 16, fontWeight: '600' },
  zoneDetail: { color: C.muted, fontSize: 13 },
  zoneCheck: { color: C.navy, fontSize: 18, fontWeight: '700' },
  step: { backgroundColor: C.field, borderRadius: 16, padding: 16, gap: 6 },
  stepTitle: { color: C.ink, fontSize: 16, fontWeight: '700' },
  stepDetail: { color: C.muted, fontSize: 14, lineHeight: 20 },
  stepStatus: { color: C.mutedSoft, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
});
