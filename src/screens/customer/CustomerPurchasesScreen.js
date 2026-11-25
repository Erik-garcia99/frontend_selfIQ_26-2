import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ClientScreen, Head, Info, Primary } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { getCustomerPurchases } from '../../services/customerService';
import { colors as C } from '../../theme/colors';

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export default function CustomerPurchasesScreen({ go, back }) {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true); setError('');
    try {
      const data = await getCustomerPurchases(accessToken, { page: nextPage, pageSize: 5 });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setPage(data?.page || nextPage);
      setTotalPages(data?.total_pages || 1);
    } catch (failure) {
      setError(failure?.message || 'No pudimos cargar tus compras.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    let active = true;
    getCustomerPurchases(accessToken, { page: 1, pageSize: 5 })
      .then((data) => {
        if (!active) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setPage(data?.page || 1);
        setTotalPages(data?.total_pages || 1);
        setError('');
      })
      .catch((failure) => { if (active) setError(failure?.message || 'No pudimos cargar tus compras.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken]);

  return (
    <ClientScreen go={go} active="purchases">
      <Head back="Volver" onBack={back} big title="Mis compras" subtitle="Historial de compras registradas" />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Info title="No se pudo cargar el historial" text={error} /> : null}
        {loading ? <ActivityIndicator color={C.navy} accessibilityLabel="Cargando compras" /> : null}
        {!loading && !error && items.length === 0 ? (
          <Info title="Sin compras todavía" text="Cuando compres en caja, tus compras aparecerán aquí." />
        ) : null}
        {items.map((sale) => (
          <View key={sale.id} style={styles.card}>
            <Text style={styles.folio}>Compra {sale.sale_number}</Text>
            <Text style={styles.total}>{money.format(Number(sale.total))}</Text>
            <Text style={styles.meta}>
              {sale.occurred_at ? new Date(sale.occurred_at).toLocaleString('es-MX') : ''}
              {sale.branch_name ? ` · ${sale.branch_name}` : ''}
            </Text>
            {Array.isArray(sale.items) && sale.items.length > 0 ? (
              <Text style={styles.lines}>{sale.items.join('\n')}</Text>
            ) : null}
          </View>
        ))}
        {totalPages > 1 ? (
          <View style={styles.pager}>
            {page > 1 ? <Primary variant="light" onPress={() => load(page - 1)}>Anterior</Primary> : null}
            <Text style={styles.meta}>Página {page} de {totalPages}</Text>
            {page < totalPages ? <Primary variant="light" onPress={() => load(page + 1)}>Siguiente</Primary> : null}
          </View>
        ) : null}
      </ScrollView>
    </ClientScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingTop: 16, paddingBottom: 24 },
  card: { backgroundColor: C.field, borderRadius: 18, padding: 16, gap: 6 },
  folio: { color: C.ink, fontSize: 16, fontWeight: '700' },
  total: { color: C.navy, fontSize: 26, fontWeight: '700' },
  meta: { color: C.muted, fontSize: 13 },
  lines: { color: C.text, fontSize: 14, lineHeight: 21, marginTop: 6 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});
