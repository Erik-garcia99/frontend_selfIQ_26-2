import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Page, Card, Button, Message, Field } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { logsService } from '../../services/logsService';
import { colors as C } from '../../theme/colors';

const CATEGORY_LABEL = {
  configuration: 'Cambios', alert: 'Avisos', security: 'Seguridad',
  access: 'Accesos', error: 'Errores',
};
const SEVERITY_LABEL = { info: 'Información', warning: 'Atención', critical: 'Crítico' };
const EMPTY = { from: '', to: '', category: '', severity: '', nodeId: '' };

const asSince = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : '';
const asUntil = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59Z` : '';
const formatDate = (value) => {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return String(value); }
};

export default function LogsScreen({ go }) {
  const { user, accessToken } = useAuth();
  const branchId = user?.branch_id;
  const [filters, setFilters] = useState(EMPTY);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [csv, setCsv] = useState(null);

  const activeFilters = () => ({
    since: asSince(filters.from), until: asUntil(filters.to),
    category: filters.category || undefined,
    severity: filters.severity || undefined,
    nodeId: filters.nodeId || undefined,
  });

  const change = (key) => (value) => setFilters((previous) => ({ ...previous, [key]: value.trim() }));

  const load = useCallback(async (offset = 0) => {
    if (!branchId) { setError('Tu cuenta necesita una sucursal asignada.'); return; }
    setLoading(true); setError('');
    try {
      const result = await logsService.list({ branchId, accessToken,
        filters: activeFilters(), offset });
      setItems((previous) => offset ? [...previous, ...result.items] : result.items);
      setHasMore(Boolean(result.has_more));
    } catch (failure) {
      setError(failure.message || 'No pudimos cargar la bitácora.');
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, accessToken, filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function exportCsv() {
    setError('');
    try {
      const text = await logsService.exportText({ branchId, accessToken,
        filters: activeFilters() });
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
      <Button onPress={() => load()} loading={loading} disabled={loading}>Buscar</Button>
      <Button dark={false} disabled={loading} onPress={() => { setFilters(EMPTY); setItems([]); }}>
        Limpiar filtros
      </Button>
      <Button dark={false} disabled={loading} onPress={exportCsv}>Descargar CSV</Button>
    </Card>

    {items.length === 0 && !loading ? <Card><Text style={S.empty}>No hay registros con esos filtros.</Text></Card> : null}
    {items.map((item) => <Card key={String(item.id)}>
      <Text style={S.date}>{formatDate(item.created_at)}</Text>
      <Text style={S.event}>{CATEGORY_LABEL[item.category] || item.category} · {SEVERITY_LABEL[item.severity] || item.severity}</Text>
      <Text style={S.title}>{item.event_type}</Text>
      {item.message ? <Text style={S.detail}>{item.message}</Text> : null}
      {item.node_id ? <Button dark={false} onPress={() => { setFilters({ ...EMPTY, nodeId: String(item.node_id) }); }}>
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
