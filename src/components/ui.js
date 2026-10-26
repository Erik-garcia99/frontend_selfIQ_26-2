import { Image, Pressable, ScrollView, Text, TextInput, View, Modal as NativeModal } from 'react-native';
import { useState } from 'react';
import { styles } from '../theme/styles';
import { colors as C } from '../theme/colors';
import { logo, navIcons } from '../theme/assets';
export function Logo({ small = false }) { return <Image accessibilityLabel="SelfIQ" source={logo} resizeMode="contain" style={[styles.logo, small && styles.logoSmall, { maxWidth: '100%' }]} />; }
export function Field({ label, placeholder, password = false, value, onChangeText, keyboardType = 'default', autoCapitalize = 'sentences', editable = true }) {
  return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={C.muted} secureTextEntry={password}
      value={value} onChangeText={onChangeText} autoCapitalize={password ? 'none' : autoCapitalize} autoCorrect={autoCapitalize !== 'none'}
      keyboardType={keyboardType} editable={editable} style={styles.field} /></View>;
}
export function Button({ children, onPress, loading = false, disabled = false, dark = true }) {
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress}
    style={[styles.button, dark ? styles.buttonDark : styles.buttonLight, { minHeight: 45, height: 'auto', padding: 12, opacity: disabled || loading ? .55 : 1 }]}>
    <Text style={[styles.buttonText, { textAlign: 'center' }]}>{loading ? 'Procesando…' : children}</Text></Pressable>;
}
export function Message({ error, success }) {
  return error || success ? <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite"
    style={{ color: error ? '#B3261E' : '#18794E', lineHeight: 20, marginBottom: 16 }}>{error || success}</Text> : null;
}
export function Nav({ active, go, disabled }) {
  return <View style={styles.nav}>{[['home', 'Inicio'], ['panel', 'Panel'], ['alerts', 'Alertas'], ['settings', 'Ajustes']].map(([id, label]) =>
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} key={id} onPress={() => go(id)} style={[styles.navItem, active === id && styles.navSelected]}>
      <Image source={navIcons[id]} style={styles.navImage} /><Text style={styles.navText}>{label}</Text>
    </Pressable>)}</View>;
}
export function Page({ title, go, children, auth = false, active = 'home', back = 'home', busy = false }) {
  return <View style={styles.appPage}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={auth ? styles.authContent : styles.formPage}>
    <View style={styles.topRow}>{go ? <Pressable accessibilityRole="button" accessibilityLabel="Volver" disabled={busy} onPress={() => go(back)} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable> : <View />}<Logo small /></View>
    <Text style={styles.formTitle}>{title}</Text>{children}
  </ScrollView>{!auth && <Nav go={go} active={active} disabled={busy} />}</View>;
}
export function Card({ children }) { return <View style={[styles.formCard, { marginBottom: 16 }]}>{children}</View>; }
export function Action({ title, detail, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.settingRow}><View style={{ flex: 1, paddingVertical: 12 }}>
    <Text style={styles.settingLabel}>{title}</Text>{detail && <Text style={{ color: C.muted, marginTop: 5 }}>{detail}</Text>}</View><Text style={styles.chevron}>›</Text></Pressable>;
}
export function TokenModal({ issued, onSaved }) {
  const [notice, setNotice] = useState('');
  return <NativeModal transparent visible={Boolean(issued)} animationType="fade" onRequestClose={() => setNotice('Guarda el token y pulsa «Ya lo guardé» para continuar.')}>
    <View style={[styles.modalLayer, { backgroundColor: 'rgba(0,29,57,.65)' }]}><View style={[styles.modal, { backgroundColor: C.white, maxWidth: 520, maxHeight: '90%' }]}>
      <ScrollView style={{ width: '100%' }}><Text style={[styles.formTitle, { fontSize: 23 }]}>{issued?.title || 'Token generado'}</Text>
        <Text style={{ color: C.text, lineHeight: 21, marginBottom: 16 }}>Selecciona y copia este token. El backend guarda su hash y no podrá mostrarlo otra vez.</Text>
        <Text selectable style={{ color: C.navy, backgroundColor: C.bg, padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16 }}>{issued?.token}</Text>
        <Text selectable style={{ color: C.muted, marginBottom: 14 }}>{issued?.idLabel}: {issued?.id}</Text>
        <Text style={{ color: C.text, lineHeight: 21, marginBottom: 18 }}>{issued?.detail}</Text>
        <Message error={notice} /><Button onPress={() => { setNotice(''); onSaved(); }}>Ya lo guardé</Button>
      </ScrollView></View></View>
  </NativeModal>;
}
