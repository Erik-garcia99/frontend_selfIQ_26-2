import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Page, Card, Button, Message, Field } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DeviceContext';
import { logsService } from '../../services/logsService';
import { colors as C } from '../../theme/colors';

const CATEGORY_LABEL = {
  configuration: 'Cambios', alert: 'Avisos', security: 'Seguridad',
  access: 'Accesos', error: 'Errores',
};
const SEVERITY_LABEL = { info: 'Información', warning: 'Atención', critical: 'Crítico' };
const EMPTY = { from: '', to: '', category: '', severity: '', nodeId: '' };

// El backend guarda created_at en UTC; si el filtro usara `Z`, un evento de
// las 21:00 locales (PST) caería en el día siguiente y no aparecería.
function localOffset() {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const rest = String(absolute % 60).padStart(2, '0');
  return `${sign}${hours}:${rest}`;
}

const asSince = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? `${value}T00:00:00${localOffset()}` : '';
const asUntil = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? `${value}T23:59:59${localOffset()}` : '';
const formatDate = (value) => {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return String(value); }
};

export default function LogsScreen({ go }) {
  const { accessToken } = useAuth();
  const d = useDevices();
  // sudo/y usuarios sin branch_id fijo usan la sucursal seleccionada en el
  // selector de la app, igual que el resto de pantallas.
  const branchId = d.branchId;
  const [filters, setFilters] = useState(EMPTY);   // lo que el usuario escribe
  const [applied, setApplied] = useState(EMPTY);   // lo que efectivamente se consultó
  const [token, setToken] = useState(0);           // recarga explícita
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [csv, setCsv] = useState(null);

  const activeFilters = (source) => ({
    since: asSince(source.from), until: asUntil(source.to),
    category: source.category || undefined,
    severity: source.severity || undefined,
    nodeId: source.nodeId || undefined,
  });

  const change = (key) => (value) => setFilters((previous) => ({ ...previous, [key]: value.trim() }));

  // Solo cambia `applied` cuando la persona pulsa Buscar/Ver todo. Escribir en
  // los campos no dispara red ni re-render de la lista (no cierra el teclado).
  function search(next = filters) {
    setApplied({ ...next });
    setToken((value) => value + 1);
  }

  function showAll() {
    setFilters(EMPTY);
    search(EMPTY);
  }

  const load = useCallback(async (offset = 0) => {
    if (!branchId) { setError('Selecciona una sucursal en el Panel para ver la bitácora.'); return; }
    setLoading(true); setError('');
    try {
      const result = await logsService.list({ branchId, accessToken,
        filters: activeFilters(applied), offset });
      setItems((previous) => offset ? [...previous, ...result.items] : result.items);
      setHasMore(Boolean(result.has_more));
    } catch (failure) {
      setError(failure.message || 'No pudimos cargar la bitácora.');
    } finally { setLoading(false); }
  }, [branchId, accessToken, applied]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, token]);

  async function exportCsv() {
    setError('');
    try {
      const text = await logsService.exportText({ branchId, accessToken,
        filters: activeFilters(applied) });
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url; link.download = 'bitacora.csv'; link.click();
        URL.revokeObjectURL(url);
      } else {
        setCsv(text);
      }
    } catch (failure) {
      setError(failure.message || 'No pudimos descargar la bitácora.');
    }
  }

  return <Page title="Bitácora" go={go} back="panel" active="panel" busy={loading}>
    <Message error={error} />

    <Card>
      <Field label="Desde (AAAA-MM-DD)" value={filters.from} onChangeText={change('from')}
        placeholder="2026-11-01" editable={!loading} />
      <Field label="Hasta (AAAA-MM-DD)" value={filters.to} onChangeText={change('to')}
        placeholder="2026-11-22" editable={!loading} />
      <Field label="Categoría (configuration, alert, security, access, error)"
        value={filters.category} onChangeText={change('category')}
        placeholder="Todas" editable={!loading} />
      <Field label="Severidad (info, warning, critical)" value={filters.severity}
        onChangeText={change('severity')} placeholder="Todas" editable={!loading} />
      <Field label="ID del nodo (opcional)" value={filters.nodeId}
        onChangeText={change('nodeId')} placeholder="Ver todo" editable={!loading} />
      <Button onPress={() => search()} loading={loading} disabled={loading}>Buscar</Button>
      <Button dark={false} disabled={loading} onPress={showAll}>
        Ver todo el historial
      </Button>
      <Button dark={false} disabled={loading} onPress={exportCsv}>Descargar CSV</Button>
    </Card>

    {items.length === 0 && !loading ? <Card><Text style={S.empty}>No hay registros con esos filtros.</Text></Card> : null}
    {items.map((item) => <Card key={String(item.id)}>
      <Text style={S.date}>{formatDate(item.created_at)}</Text>
      <Text style={S.event}>{CATEGORY_LABEL[item.category] || item.category} · {SEVERITY_LABEL[item.severity] || item.severity}</Text>
      <Text style={S.title}>{item.event_type}</Text>
      {item.message ? <Text style={S.detail}>{item.message}</Text> : null}
      {item.node_id ? <Button dark={false} onPress={() => {
        const onlyNode = { ...EMPTY, nodeId: String(item.node_id) };
        setFilters(onlyNode);
        search(onlyNode);
      }}>
        Ver solo este nodo
      </Button> : null}
    </Card>)}
    {hasMore ? <Button dark={false} loading={loading} onPress={() => load(items.length)}>Cargar más</Button> : null}

    <Modal visible={!!csv} transparent animationType="fade"
      onRequestClose={() => setCsv(null)}>
      <View style={S.backdrop}>
        <View style={S.sheet}>
          <Text style={S.sheetTitle}>Bitácora en CSV</Text>
          <ScrollView style={S.csv}>
            <Text selectable>{csv}</Text>
          </ScrollView>
          <Button dark={false} onPress={() => setCsv(null)}>Cerrar</Button>
        </View>
      </View>
    </Modal>
  </Page>;
}

const S = StyleSheet.create({
  empty: { color: C.muted, fontSize: 14 },
  date: { color: C.muted, fontSize: 12, marginBottom: 2 },
  event: { color: C.muted, fontSize: 12, marginBottom: 4 },
  title: { color: C.navy, fontSize: 16, fontWeight: '600' },
  detail: { color: C.text, fontSize: 14, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: C.field, borderRadius: 20, padding: 18, maxHeight: '80%' },
  sheetTitle: { color: C.navy, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  csv: { maxHeight: 360 },
});
