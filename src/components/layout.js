import { Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { colors as C } from '../theme/colors';
import { layoutStyles as L } from '../theme/layout';
import { navIcons } from '../theme/assets';

// Primitivas del rediseño. Todo lo que sigue está medido sobre los frames de
// Figma: contenedor 374, filas de 58, campos de 52/73, radios 16/20/24.

export function BottomNav({ go, active }) {
  return <View style={L.nav}>{[['home', 'Inicio'], ['panel', 'Panel'], ['alerts', 'Alertas'], ['settings', 'Ajustes']].map(([id, label]) =>
    <Pressable key={id} accessibilityRole="button" accessibilityLabel={label} onPress={() => go?.(id)} style={L.navItem}>
      <Image source={navIcons[id]} style={[L.navIcon, { tintColor: active === id ? C.navActive : C.navIdle }]} />
      <Text style={[L.navText, active === id && L.navTextActive]}>{label}</Text>
    </Pressable>)}</View>;
}

export function Screen({ children, go, active }) {
  return <View style={L.screen}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={L.scroll}>{children}</ScrollView>
    {go ? <BottomNav go={go} active={active} /> : null}</View>;
}

export function AuthScreen({ children }) {
  return <View style={L.screen}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={L.authScroll}>{children}</ScrollView></View>;
}

export function Head({ title, subtitle, back, onBack, big = false }) {
  return <View>{back ? <Pressable accessibilityRole="button" accessibilityLabel={`Volver a ${back}`} onPress={onBack} style={L.backLinkWrap}>
    <Text style={L.backLink}>‹  {back}</Text></Pressable> : null}
    <Text accessibilityRole="header" style={big ? L.h1 : L.h2}>{title}</Text>
    {subtitle ? <Text style={L.subtitle}>{subtitle}</Text> : null}</View>;
}

export function Identity({ name, detail, status = 'Sesión activa' }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <View style={L.identity}>
    <View style={L.avatar}><Text style={L.avatarText}>{initials || '?'}</Text></View>
    <View style={{ flex: 1 }}>
      <Text numberOfLines={1} style={L.identityName}>{name || 'Mi cuenta'}</Text>
      {detail ? <Text numberOfLines={1} style={L.identityDetail}>{detail}</Text> : null}
      <Text style={L.identityStatus}>{status}</Text>
    </View>
  </View>;
}

export function NavRow({ label, detail, onPress, danger = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [L.row, pressed && L.rowPressed]}>
    <View style={{ flex: 1 }}><Text style={danger ? L.rowDanger : L.rowLabel}>{label}</Text>
      {detail ? <Text style={L.rowDetail}>{detail}</Text> : null}</View>
    {danger ? null : <Text style={L.rowChevron}>›</Text>}
  </Pressable>;
}

export function SectionLabel({ children }) { return <Text style={L.section}>{children}</Text>; }

export function TextField({ label, style, ...rest }) {
  return <View style={{ marginBottom: 18 }}>{label ? <Text style={L.fieldLabel}>{label}</Text> : null}
    <TextInput accessibilityLabel={label} placeholderTextColor={C.mutedSoft} style={[L.input, style]} {...rest} /></View>;
}

// Campo con forma de tarjeta (374×73): etiqueta pequeña arriba y el valor abajo.
export function FieldCard({ label, value, onChangeText, placeholder, editable = true, secure = false, keyboardType = 'default', autoCapitalize = 'sentences' }) {
  const common = { value, onChangeText, placeholder, placeholderTextColor: C.mutedSoft, editable, secureTextEntry: secure, keyboardType, autoCapitalize };
  return <View style={L.fieldCard}>
    <Text style={L.fieldCardLabel}>{label}</Text>
    {onChangeText ? <TextInput accessibilityLabel={label} style={L.fieldCardValue} {...common} />
      : <Text accessibilityLabel={label} selectable style={L.fieldCardValue}>{value || placeholder || '—'}</Text>}
  </View>;
}

export function ToggleRow({ label, value, onValueChange }) {
  return <View style={L.switchRow}><Text style={L.switchLabel}>{label}</Text>
    <Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} trackColor={{ false: C.border, true: C.navy }} thumbColor={C.field} ios_backgroundColor={C.border} /></View>;
}

export function Primary({ children, onPress, loading = false, disabled = false, variant = 'dark', tall = false, loadingLabel = 'Procesando…' }) {
  const off = disabled || loading;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: off, busy: loading }} disabled={off} onPress={onPress}
    style={({ pressed }) => [variant === 'light' ? L.secondary : L.primary, tall && L.primaryTall, off && { opacity: .55 }, pressed && { opacity: .8 }]}>
    <Text style={variant === 'light' ? L.secondaryText : L.primaryText}>{loading ? loadingLabel : children}</Text></Pressable>;
}

export function Info({ title, children }) {
  return <View style={L.cardSoft}>{title ? <Text style={L.cardTitle}>{title}</Text> : null}
    {typeof children === 'string' ? <Text style={L.cardText}>{children}</Text> : children}</View>;
}

export function LinkButton({ children, onPress, align = 'center' }) {
  return <Pressable accessibilityRole="link" onPress={onPress} style={align === 'center' ? L.linkWrap : undefined}>
    <Text style={[L.link, align === 'right' && { textAlign: 'right' }]}>{children}</Text></Pressable>;
}
