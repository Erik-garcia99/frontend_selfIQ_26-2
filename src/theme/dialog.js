import { StyleSheet } from 'react-native';
import { colors as C } from './colors';

// Estilos del diálogo de resultado (éxito / error).
// Valores tomados del archivo Figma "SelfIQ-2026-2":
//   - overlay: rectángulo #49769F, radio 10, ancho 384 (frame de 430)
//   - título 24px, botón oscuro #2C2C2C radio 8 alineado a la derecha
export const dialogStyles = StyleSheet.create({
  layer: { flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: 23 },
  card: {
    width: '100%', maxWidth: 384, backgroundColor: C.dialog, borderRadius: 10, padding: 24,
    borderTopWidth: 4, shadowColor: C.navy, shadowOpacity: .25, shadowRadius: 26, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  glyph: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  glyphText: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28, marginBottom: 4 },
  code: { color: C.dialogMuted, fontSize: 13, fontWeight: '600', letterSpacing: .6, marginBottom: 10 },
  message: { color: C.dialogText, fontSize: 16, lineHeight: 22, marginBottom: 8 },
  hint: { color: C.dialogMuted, fontSize: 14, lineHeight: 20, marginBottom: 4 },
  button: { alignSelf: 'flex-end', marginTop: 16, backgroundColor: '#2C2C2C', borderRadius: 8, paddingHorizontal: 18, minHeight: 40, justifyContent: 'center' },
  buttonText: { color: '#F5F5F5', fontSize: 16, fontWeight: '500' },
});
