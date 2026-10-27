import { Modal as NativeModal, Pressable, Text, View } from 'react-native';
import { colors as C } from '../theme/colors';
import { dialogStyles as D } from '../theme/dialog';

// El "pantallazo" de resultado del diseño: una tarjeta azul sobre el contenido
// que confirma una operación o explica por qué falló, con un código corto
// para soporte y un mensaje en lenguaje normal (sin tecnicismos).
const GLYPH = { success: '✓', error: '!', info: 'i' };

export function FeedbackDialog({ visible = false, variant = 'success', title, message, code, hint, actionLabel = 'Entendido', onClose, busy = false }) {
  const error = variant === 'error';
  const accent = error ? C.dangerLight : variant === 'info' ? C.blue : C.successLight;
  return <NativeModal transparent visible={visible} animationType="fade" onRequestClose={busy ? undefined : onClose}>
    <View style={D.layer}>
      <View accessibilityRole="alert" accessibilityLiveRegion="assertive" accessibilityViewIsModal
        style={[D.card, { borderTopColor: accent }]}>
        <View style={[D.glyph, { borderColor: accent }]}><Text style={[D.glyphText, { color: accent }]}>{GLYPH[error ? 'error' : 'success']}</Text></View>
        <Text style={[D.title, { color: accent }]}>{title}</Text>
        {error && code ? <Text selectable style={D.code}>Código de error: {code}</Text> : null}
        <Text style={D.message}>{message}</Text>
        {hint ? <Text style={D.hint}>{hint}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={busy ? 'Procesando' : actionLabel} disabled={busy} onPress={onClose}
          style={[D.button, busy && { opacity: .55 }]}>
          <Text style={D.buttonText}>{busy ? 'Procesando…' : actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  </NativeModal>;
}
