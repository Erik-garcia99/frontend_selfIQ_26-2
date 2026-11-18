import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Head, Info, Primary, Screen } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DeviceContext';
import { colors as C } from '../../theme/colors';
import { useShelfStates } from '../../utils/useShelfStates';
import { canManage } from '../../utils/validation';

const TONES = {
  adequate: { label: 'Adecuado', color: C.green },
  medium: { label: 'Medio', color: C.text },
  low: { label: 'Bajo', color: C.dangerText },
  empty: { label: 'Agotado', color: C.danger },
  unknown: { label: 'Desconocido', color: C.muted },
};
const QUALITY = {
  ok: 'Lectura reciente',
  stale: 'Último valor conocido; no es una medición nueva',
  no_data: 'Sin lectura disponible',
  camera_moved: 'La cámara se movió; recalibra la zona',
  not_calibrated: 'Zona sin calibrar',
};

function StateCard({ state, canEdit, onEdit }) {
  const tone = TONES[state.status] || TONES.unknown;
  const detail = state.sku ? `${state.sku} · ${state.shelf_name || 'Estante'}` : (state.shelf_name || 'Estante');
  const age = state.quality === 'ok' || state.quality === 'stale'
    ? `Hace ${state.age_seconds ?? '—'} s` : '';
  return <View style={S.card}>
    <View style={S.row}>
      <Text style={S.title}>{state.roi_name || 'Zona'}</Text>
      <View style={[S.chip, { backgroundColor: tone.color }]}>
        <Text style={S.chipText}>{tone.label}</Text>
      </View>
    </View>
    <Text style={S.detail}>{detail}</Text>
    <View style={S.row}>
      <Text accessibilityLabel={`Ocupación visual: ${state.occupancy_pct ?? 'sin lectura'} por ciento`}
        style={S.value}>{state.occupancy_pct === null || state.occupancy_pct === undefined ? '—' : `${state.occupancy_pct}%`}</Text>
      <Text style={S.quality}>{QUALITY[state.quality] || 'Estado no disponible'}</Text>
    </View>
    {age ? <Text style={S.meta}>{age} · Confirmación: {TONES[state.status]?.label || 'Desconocido'}</Text> : null}
    {canEdit ? <Pressable accessibilityRole="button" accessibilityLabel={`Ajustar umbrales de ${state.roi_name || 'zona'}`}
      onPress={onEdit} style={S.linkWrap}><Text style={S.link}>Ajustar umbrales</Text></Pressable> : null}
  </View>;
}

export default function ShelfStatesScreen({ go }) {
  const { user, accessToken } = useAuth();
  const { branchId } = useDevices();
  const { states, loading, error, refresh } = useShelfStates({ branchId, accessToken });

  return <Screen go={go} active="home">
    <Head title="Estado de repisas" subtitle="Ocupación visual; no es inventario ni conteo de productos." big />
    {error ? <Info title="No se pudo consultar">{error}</Info> : null}
    {!branchId ? <Info title="Sin sucursal">Selecciona una sucursal para ver sus repisas.</Info> : null}
    {loading && !states ? <Info title="Consultando estados">Obteniendo el estado de las repisas…</Info> : null}
    {states && states.length === 0 ? <Info title="Sin repisas">Todavía no hay zonas configuradas en esta sucursal.</Info> : null}
    {(states || []).map(state => <StateCard key={state.roi_id} state={state}
      canEdit={canManage(user)} onEdit={() => go('thresholds')} />)}
    <Primary onPress={refresh} variant="light" loading={loading}>Actualizar estados</Primary>
  </Screen>;
}

const S = StyleSheet.create({
  card: { backgroundColor: C.field, borderRadius: 20, padding: 18, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { color: C.ink, fontSize: 18, fontWeight: '700', flexShrink: 1 },
  chip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: C.white, fontSize: 13, fontWeight: '700' },
  detail: { color: C.muted, fontSize: 14 },
  value: { color: C.navy, fontSize: 30, fontWeight: '700' },
  quality: { color: C.muted, fontSize: 13, flexShrink: 1, textAlign: 'right' },
  meta: { color: C.muted, fontSize: 12 },
  linkWrap: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: C.link, fontSize: 15, fontWeight: '700' },
});
