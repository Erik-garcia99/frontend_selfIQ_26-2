import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors as C } from '../../theme/colors';

export function Copy({ children, muted = false, style }) {
  return <Text style={[muted ? styles.muted : styles.copy, style]}>{children}</Text>;
}

export function Card({ title, eyebrow, tone, children, onPress }) {
  const content = <>
    {eyebrow ? <Text style={[styles.eyebrow, tone === 'danger' && styles.dangerText]}>{eyebrow}</Text> : null}
    {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
    {children}
  </>;
  const skin = [styles.card, tone && styles[tone]];
  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [...skin, pressed && styles.pressed]}>{content}</Pressable>
    : <View style={skin}>{content}</View>;
}

export function Action({ children, onPress, secondary = false, disabled = false }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.action, secondary ? styles.secondary : styles.primary,
      disabled && styles.disabled, pressed && styles.pressed]}>
    <Text style={[styles.actionText, !secondary && styles.onDark]}>{children}</Text>
  </Pressable>;
}

export function Tabs({ items }) {
  return <View style={styles.tabs}>{items.map(({ label, onPress, active }) =>
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: Boolean(active) }}
      onPress={onPress} style={({ pressed }) => [styles.tab, active && styles.primary, pressed && styles.pressed]}>
      <Text style={[styles.tabText, active && styles.onDark]}>{label}</Text>
    </Pressable>)}</View>;
}

export function Pair({ label, value }) {
  return <View style={styles.pair}><Text style={styles.pairLabel}>{label}</Text><Text style={styles.pairValue}>{value}</Text></View>;
}

export const styles = StyleSheet.create({
  header: { marginBottom: 18, gap: 6 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 14, gap: 6 },
  cardTitle: { color: C.navy, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  copy: { color: C.ink, fontSize: 13, lineHeight: 20 },
  muted: { color: C.muted, fontSize: 12, lineHeight: 18 },
  eyebrow: { color: '#8A6419', fontSize: 10, fontWeight: '700', lineHeight: 16 },
  dangerText: { color: C.dangerText },
  warning: { backgroundColor: '#FFF1D0' },
  danger: { backgroundColor: '#FBE9E9' },
  success: { backgroundColor: '#E0F0E7' },
  hero: { backgroundColor: C.navy, borderRadius: 16, padding: 18, marginBottom: 14, gap: 7 },
  heroTitle: { color: C.white, fontSize: 20, fontWeight: '700' },
  onDark: { color: C.white },
  action: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  primary: { backgroundColor: C.navy },
  secondary: { backgroundColor: C.white },
  actionText: { color: C.navy, textAlign: 'center', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  tabs: { flexDirection: 'row', gap: 7, marginBottom: 14, flexWrap: 'wrap' },
  tab: { flex: 1, minWidth: 76, minHeight: 44, backgroundColor: C.white, borderRadius: 11, padding: 9, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: C.navy, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 3 },
  pairLabel: { color: C.muted, fontSize: 12, lineHeight: 18, flexGrow: 1, flexBasis: '42%' },
  pairValue: { color: C.ink, fontSize: 12, lineHeight: 18, flexGrow: 1, flexBasis: '48%', fontWeight: '500' },
  row: { flexDirection: 'row', gap: 8 },
  grow: { flex: 1 },
  preview: { marginBottom: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#8A6419', backgroundColor: '#FFF1D0', gap: 6 },
  previewTitle: { color: C.navy, fontSize: 12, fontWeight: '700' },
  exit: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  exitText: { color: C.link, fontSize: 12, textDecorationLine: 'underline' },
  input: { minHeight: 48, backgroundColor: C.field, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, color: C.ink, fontSize: 14 },
  notes: { minHeight: 110, textAlignVertical: 'top' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.link, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.navy },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepButton: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: C.bg },
  stepLabel: { color: C.navy, fontSize: 22, fontWeight: '600' },
  stepValue: { flex: 1, color: C.navy, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  chart: { height: 150, flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  threshold: { position: 'absolute', left: 0, right: 0, bottom: 88, borderTopWidth: 1, borderTopColor: C.danger },
  column: { flex: 1, alignItems: 'center', gap: 5 },
  bar: { width: '75%', borderRadius: 4, backgroundColor: C.blue },
  chartNumber: { color: C.ink, fontSize: 11 },
  chartTime: { color: C.muted, fontSize: 9 },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 },
  heatLabel: { width: 42, color: C.muted, fontSize: 10 },
  heatCell: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  heatText: { color: C.navy, fontSize: 11, fontWeight: '600' },
  floor: { backgroundColor: C.bg, padding: 12, borderRadius: 14, gap: 12 },
  shelf: { flex: 1, minHeight: 130, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 5 },
  area: { flex: 1, minHeight: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 8 },
  shelfName: { color: C.navy, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  shelfDetail: { color: C.ink, fontSize: 11, textAlign: 'center', lineHeight: 17 },
  filterRow: { minHeight: 48, borderBottomWidth: 1, borderBottomColor: C.border, justifyContent: 'center', paddingVertical: 5 },
});
