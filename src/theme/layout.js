import { StyleSheet } from 'react-native';
import { colors as C } from './colors';

// Sistema visual nuevo (frames 01–04 de Figma, base 430×932).
// El código anterior usa `theme/styles.js`; este archivo lo reemplaza en las
// pantallas rediseñadas. Cuando todas migren, styles.js se puede retirar.
export const layoutStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 28, paddingTop: 54, paddingBottom: 132, flexGrow: 1 },
  authScroll: { paddingHorizontal: 28, paddingTop: 54, paddingBottom: 24, flexGrow: 1, justifyContent: 'space-between' },

  // Tipografía
  h1: { color: C.navy, fontSize: 28, fontWeight: '700', lineHeight: 34 },
  h2: { color: C.navy, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  subtitle: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  section: { color: C.section, fontSize: 13, fontWeight: '600', marginTop: 26, marginBottom: 12 },
  backLink: { color: C.navy, fontSize: 13, fontWeight: '600' },
  backLinkWrap: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12, marginBottom: 10 },
  note: { color: C.muted, fontSize: 11, lineHeight: 17 },
  link: { color: C.link, fontSize: 13, fontWeight: '600' },
  linkWrap: { alignSelf: 'center', padding: 12, marginTop: 8 },

  // Tarjetas
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardSoft: { backgroundColor: C.white, borderRadius: 20, padding: 18, marginBottom: 14 },
  cardTitle: { color: C.navy, fontSize: 17, fontWeight: '600', lineHeight: 22, marginBottom: 4 },
  cardText: { color: C.muted, fontSize: 12, lineHeight: 18 },

  // Identidad
  identity: {
    backgroundColor: C.navy, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 8,
    shadowColor: C.navy, shadowOpacity: .22, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginRight: 18 },
  avatarText: { color: C.navy, fontSize: 22, fontWeight: '700' },
  identityName: { color: C.white, fontSize: 17, fontWeight: '600' },
  identityDetail: { color: C.subtitleOnDark, fontSize: 11, marginTop: 4 },
  identityStatus: { color: C.online, fontSize: 10, fontWeight: '600', marginTop: 4 },

  // Filas de navegación
  row: { backgroundColor: C.white, borderRadius: 16, minHeight: 58, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  rowLabel: { color: C.ink, fontSize: 14, fontWeight: '500', flex: 1 },
  rowDetail: { color: C.muted, fontSize: 12, marginTop: 3 },
  rowChevron: { color: C.muted, fontSize: 20, marginLeft: 10 },
  rowDanger: { color: C.dangerText, fontSize: 14, fontWeight: '600' },
  rowPressed: { opacity: .7 },

  // Campos
  fieldLabel: { color: C.link, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { height: 52, backgroundColor: C.field, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, color: C.ink, fontSize: 15 },
  fieldCard: { backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 14 },
  fieldCardLabel: { color: C.muted, fontSize: 11, fontWeight: '500', marginBottom: 6 },
  fieldCardValue: { color: C.ink, fontSize: 14, fontWeight: '500', padding: 0 },
  fieldCardPlaceholder: { color: C.mutedSoft },
  switchRow: { backgroundColor: C.white, borderRadius: 16, minHeight: 56, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  switchLabel: { color: C.ink, fontSize: 14, fontWeight: '500', flex: 1, paddingRight: 12 },

  // Botones
  primary: { height: 52, borderRadius: 16, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryTall: { height: 54, borderRadius: 17 },
  primaryText: { color: C.white, fontSize: 15, fontWeight: '600' },
  dangerButton: { height: 52, borderRadius: 16, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secondary: { height: 52, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryText: { color: C.ink, fontSize: 14, fontWeight: '600' },

  // Autenticación
  authTitle: { color: C.navy, fontSize: 28, fontWeight: '700', paddingHorizontal: 12, marginBottom: 22 },
  authCard: { backgroundColor: C.white, borderRadius: 26, padding: 20, shadowColor: C.navy, shadowOpacity: .12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  authHead: { paddingHorizontal: 2, marginBottom: 26 },
  authForgot: { color: C.link, fontSize: 13, fontWeight: '600', textAlign: 'right', marginTop: -4, marginBottom: 18, paddingVertical: 4 },
  authRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 },
  authMuted: { color: C.muted, fontSize: 13 },
  brand: { marginTop: 40, paddingHorizontal: 12 },
  brandTitle: { color: C.section, fontSize: 13, fontWeight: '600' },
  brandText: { color: C.muted, fontSize: 11, marginTop: 3 },

  // Bottom nav
  nav: {
    position: 'absolute', left: 15, right: 15, bottom: 24, height: 70, backgroundColor: C.white, borderRadius: 24,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: C.navy, shadowOpacity: .18, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  navIcon: { width: 22, height: 22, marginBottom: 5 },
  navText: { fontSize: 10, fontWeight: '500', color: C.navIdle },
  navTextActive: { color: C.navActive, fontWeight: '600' },
});
