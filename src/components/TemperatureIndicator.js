import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors as C } from '../theme/colors';
import { dialogStyles as D } from '../theme/dialog';
import { styles } from '../theme/styles';
import { temperaturePresentation } from '../utils/temperature';

const backgrounds = { cold: C.blue, comfortable: C.greenSoft, hot: '#FFC7C4', unavailable: C.border };

// Reutiliza el recuadro original dentro de Aforo actual; no agrega tarjetas a Inicio.
export default function TemperatureIndicator({ telemetry }) {
  const [expanded, setExpanded] = useState(false);
  const { branches, branchId, selectBranch, data, loading, refresh } = telemetry;
  const reading = temperaturePresentation(telemetry);
  const branch = branches.find((item) => item.id === branchId);
  const backgroundColor = backgrounds[reading.tone];
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Temperatura: ${reading.label}. ${reading.status}. Ver detalles.`}
      accessibilityHint="Consulta la última medición, cambia de sucursal o vuelve a intentar la consulta."
      onPress={() => setExpanded(true)} style={[styles.temp, { backgroundColor }]}>
      <Text style={styles.tempTitle}>Temperatura</Text>
      <Text accessibilityLiveRegion="polite" style={styles.tempValue}>{reading.label}</Text>
      {reading.tone === 'unavailable' && <Text style={s.status}>{reading.status}</Text>}
    </Pressable>
    <Modal transparent visible={expanded} animationType="fade" onRequestClose={() => setExpanded(false)}>
      <View style={D.layer}><View accessibilityViewIsModal style={[D.card, { borderTopColor: backgroundColor }]}>
        <ScrollView contentContainerStyle={s.details}>
          <Text style={[D.title, s.light]}>Temperatura</Text>
          {branch && <Text style={D.hint}>{branch.name}</Text>}
          <Text style={[D.title, { color: backgroundColor }]}>{reading.label} · {reading.status}</Text>
          <Text accessibilityLiveRegion="polite" style={D.message}>{reading.detail}</Text>
          {telemetry.error ? <Text style={D.hint}>Motivo: {telemetry.error}{telemetry.errorStatus ? ` (HTTP ${telemetry.errorStatus})` : ''}</Text> : null}
          {data?.measured_at && <Text style={D.hint}>Última medición: {new Date(data.measured_at).toLocaleString('es-MX')}</Text>}
          {branches.length > 1 && <View style={s.branches}>
            <Text style={D.message}>Consultar sucursal</Text>
            {branches.map((item) => <Pressable key={item.id} accessibilityRole="button"
              accessibilityState={{ selected: item.id === branchId }}
              onPress={() => { selectBranch(item.id); setExpanded(false); }}
              style={[s.branch, item.id === branchId && s.selected]}>
              <Text style={s.light}>{item.name}</Text>
            </Pressable>)}
          </View>}
          <View style={s.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Actualizar temperatura" disabled={loading}
              onPress={refresh} style={[D.button, s.button, loading && s.disabled]}>
              <Text style={D.buttonText}>{loading ? 'Actualizando…' : 'Actualizar'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setExpanded(false)} style={[D.button, s.button]}>
              <Text style={D.buttonText}>Cerrar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View></View>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  status: { color: C.navy, fontSize: 10, lineHeight: 12, marginTop: 2 },
  details: { gap: 8 },
  light: { color: C.dialogText },
  branches: { gap: 8, marginTop: 8 },
  branch: { minHeight: 44, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.dialogMuted, justifyContent: 'center' },
  selected: { backgroundColor: C.navy },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  button: { minHeight: 44 },
  disabled: { opacity: 0.5 },
});
