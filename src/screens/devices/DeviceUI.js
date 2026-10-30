import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Screen, Head, Info, Primary } from '../../components/layout';
import { colors } from '../../theme/colors';
import { useDevices } from '../../context/DeviceContext';
export { FieldCard, Primary, Info, NavRow, SectionLabel } from '../../components/layout';
export { useDevices } from '../../context/DeviceContext';
export { deviceLabel, statusLabel, LIGHT_LIMIT } from '../../services/deviceService';
export function Shell({ go, title, subtitle, back = 'devices', busy = false, children }) {
  return <Screen go={busy ? undefined : go} active="panel"><Head title={title} subtitle={subtitle} back={busy ? undefined : 'Volver'} onBack={() => go(back)} />
    <View style={{ gap: 16, paddingTop: 20 }}>{children}</View></Screen>;
}
export function Copy({ children }) { return <Text style={{ color: colors.text, fontSize: 15, lineHeight: 23 }}>{children}</Text>; }
export function ErrorNotice({ message }) { return message ? <View accessibilityLiveRegion="polite"><Info title="No pudimos completar la acción">{message}</Info></View> : null; }
export function Wait({ children }) { return <Info><ActivityIndicator color={colors.navy} /><Copy>{children || 'Cargando…'}</Copy></Info>; }
export function useData(operation, payload = {}) {
  const { request } = useDevices(); const [version, setVersion] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const key = JSON.stringify(payload);
  // Reset during render (instead of inside the effect) to avoid cascading renders.
  const requestKey = `${operation}:${key}:${version}`;
  const [previousKey, setPreviousKey] = useState(requestKey);
  if (previousKey !== requestKey) {
    setPreviousKey(requestKey);
    setState({ loading: true, data: null, error: '' });
  }
  useEffect(() => { let active = true;
    request(operation, JSON.parse(key)).then(data => { if (active) setState({ loading: false, data, error: '' }); })
      .catch(error => { if (active) setState({ loading: false, data: null, error: error.code === 'NOT_AVAILABLE' ? 'Esta función todavía no está disponible. Inténtalo más tarde.' : 'No se pudo cargar la información. Comprueba tu conexión y que tengas una sucursal asignada.' }); });
    return () => { active = false; };
  }, [operation, key, version]);
  return { ...state, reload: () => setVersion(v => v + 1) };
}
export function LoadState({ state, children }) {
  if (state.loading) return <Wait />;
  if (state.error) return <><ErrorNotice message={state.error} /><Primary onPress={state.reload}>Reintentar</Primary></>;
  return children;
}
export function useSave(go) {
  const d = useDevices(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function save(operation, payload, destination) {
    if (busy) return; setBusy(true); setError('');
    try { const result = await d.mutate(operation, payload); if (!result?.id) throw new Error('missing confirmation');
      d.setResult(result); go(destination);
    } catch { setError('No pudimos confirmar los cambios. Revisa la información guardada antes de intentarlo de nuevo.'); }
    finally { setBusy(false); }
  }
  return { busy, error, save };
}
