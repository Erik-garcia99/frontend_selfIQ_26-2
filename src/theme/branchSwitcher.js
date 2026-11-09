import { StyleSheet } from 'react-native';
import { colors as C } from './colors';

export const branchSwitcherStyles = StyleSheet.create({
  trigger: {
    maxWidth: 220, minHeight: 38, backgroundColor: C.white, borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 8, flexDirection: 'row', alignItems: 'center',
    shadowColor: C.navy, shadowOpacity: .18, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  pressed: { opacity: .82 },
  triggerName: { color: C.ink, fontSize: 11, fontWeight: '700', maxWidth: 112 },
  triggerStatus: { color: '#287D64', fontSize: 10, fontWeight: '600', marginLeft: 5 },
  offlineText: { color: C.dangerText },
  chevron: { color: C.muted, fontSize: 16, marginLeft: 6, marginTop: -3 },
  dot: { width: 7, height: 7, borderRadius: 4, marginLeft: 8 },
  dotOnline: { backgroundColor: '#369372' },
  dotOffline: { backgroundColor: '#EF3340' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,29,57,.16)' },
  menu: {
    position: 'absolute', top: 82, right: 20, width: 220, backgroundColor: C.white, borderRadius: 18, padding: 10,
    shadowColor: C.navy, shadowOpacity: .25, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 14,
  },
  menuTitle: { color: C.muted, fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8, textTransform: 'uppercase' },
  option: { minHeight: 52, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center' },
  optionSelected: { backgroundColor: '#8BC9ED' },
  optionTextWrap: { flex: 1 },
  optionName: { color: C.ink, fontSize: 12, fontWeight: '600' },
  optionNameSelected: { color: C.navy, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  optionStatus: { color: '#287D64', fontSize: 9, fontWeight: '600', marginLeft: 5 },
  check: { color: C.navy, fontSize: 15, fontWeight: '800', marginLeft: 8 },
  errorBox: { padding: 10 },
  errorText: { color: C.dangerText, fontSize: 11, lineHeight: 16 },
  retry: { color: C.link, fontSize: 11, fontWeight: '700', marginTop: 8 },
  empty: { color: C.muted, fontSize: 11, padding: 10 },
});
