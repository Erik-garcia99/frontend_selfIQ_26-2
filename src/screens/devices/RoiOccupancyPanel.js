import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ErrorNotice, Info, LoadState, Primary, useData } from './DeviceUI';
import { useRoiOccupancy } from '../../utils/useRoiOccupancy.js';
import { roiOccupancyPresentation } from '../../utils/roiOccupancy.js';
import { colors as C } from '../../theme/colors';

function RoiOccupancyCard({ branchId, roi, accessToken }) {
  const telemetry = useRoiOccupancy({ branchId, roiId: roi.id, accessToken });
  const view = roiOccupancyPresentation(telemetry, telemetry.now);
  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.name}>{roi.name || 'Zona'}</Text>
    {roi.product_name ? <Text style={styles.copy}>{roi.product_name}{roi.product_sku ? ` · ${roi.product_sku}` : ''}</Text> : null}
    <View style={styles.row}>
      <Text accessibilityLabel={`Ocupación visual: ${view.label}`} style={[styles.value, view.outdated && styles.old]}>{view.label}</Text>
      <Text style={styles.status}>{view.status}</Text>
      {telemetry.loading ? <ActivityIndicator color={C.navy} accessibilityLabel="Actualizando ocupación" /> : null}
    </View>
    <Text style={styles.copy}>{view.detail}</Text>
    {view.outdated ? <Text style={styles.warning}>Último valor conocido; no representa una medición nueva.</Text> : null}
    {telemetry.reading?.config_version != null && telemetry.reading?.calibration_version != null ?
      <Text style={styles.meta}>Configuración {telemetry.reading.config_version} · Calibración {telemetry.reading.calibration_version}</Text> : null}
    <Pressable accessibilityRole="button" accessibilityLabel={`Actualizar ocupación de ${roi.name || 'zona'}`}
      accessibilityState={{ disabled: telemetry.loading }} disabled={telemetry.loading}
      onPress={telemetry.refresh} style={styles.button}>
      <Text style={styles.link}>{telemetry.error ? 'Reintentar' : 'Actualizar lectura'}</Text>
    </Pressable>
  </View>;
}

export default function RoiOccupancyPanel({ branchId, shelfId, accessToken }) {
  const state = useData('listRois', { branchId, shelfId });
  const rois = state.data?.rois;
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>Ocupación visual por zona</Text>
    <Text style={styles.copy}>Área ocupada respecto al lleno de referencia. No es conteo de productos ni inventario POS. Se consulta cada 10 segundos mientras esta pantalla está activa.</Text>
    <LoadState state={state}>
      {Array.isArray(rois) ? rois.length ? rois.map((roi) =>
        <RoiOccupancyCard key={`${branchId}:${shelfId}:${roi.id}:${state.data.applied_version}:${roi.calibration_version}:${accessToken}`}
          branchId={branchId} roi={roi} accessToken={accessToken} />) :
        <Info title="Sin zonas">Configura una zona y prepárala desde la app para comenzar a medir.</Info> :
        <ErrorNotice message="No pudimos interpretar la lista de zonas. Intenta actualizarla." />}
      <Primary onPress={state.reload}>Actualizar zonas</Primary>
    </LoadState>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  heading: { color: C.ink, fontSize: 21, fontWeight: '700' },
  card: { backgroundColor: C.field, borderRadius: 20, padding: 18, gap: 10 },
  name: { color: C.ink, fontSize: 18, fontWeight: '700' },
  copy: { color: C.muted, fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  value: { color: C.navy, fontSize: 34, fontWeight: '700' },
  old: { color: C.muted },
  status: { color: C.text, fontSize: 14, fontWeight: '600' },
  warning: { color: C.dangerText, fontSize: 14, lineHeight: 20 },
  meta: { color: C.muted, fontSize: 12 },
  button: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: C.link, fontSize: 15, fontWeight: '700' },
});
