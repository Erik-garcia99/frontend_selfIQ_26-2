import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ClientScreen, Head, Info, Primary, SectionLabel } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBranches, getCustomerShelves } from '../../services/customerService';
import { colors as C } from '../../theme/colors';

export default function CustomerMapScreen({ go, back, params }) {
  const { accessToken } = useAuth();

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const [shelves, setShelves] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingShelves, setLoadingShelves] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Cargar sucursales
  useEffect(() => {
    if (!accessToken) return;
    let isCurrent = true;
    setLoadingBranches(true);
    getCustomerBranches(accessToken, { page: 1, pageSize: 5 })
      .then((data) => {
        if (!isCurrent) return;
        const items = data.items || [];
        setBranches(items);
        if (items.length > 0) {
          setSelectedBranchId((prev) => prev || items[0].id);
        }
      })
      .catch((err) => {
        if (!isCurrent) return;
        setError(err.message || 'No se pudieron cargar las sucursales.');
      })
      .finally(() => {
        if (isCurrent) setLoadingBranches(false);
      });
    return () => { isCurrent = false; };
  }, [accessToken]);

  const loadShelves = useCallback(async (branchId, pageNum, append) => {
    if (!accessToken || !branchId) return;
    if (append) setLoadingMore(true); else setLoadingShelves(true);
    setError(null);
    try {
      const data = await getCustomerShelves(accessToken, branchId, { page: pageNum, pageSize: 5 });
      const items = data.items || [];
      setShelves((prev) => (append ? [...prev, ...items] : items));
      setPage(data.page || pageNum);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los estantes.');
    } finally {
      if (append) setLoadingMore(false); else setLoadingShelves(false);
    }
  }, [accessToken]);

  // Cargar estantes al cambiar sucursal
  useEffect(() => {
    if (!selectedBranchId) return;
    setShelves([]);
    setPage(1);
    setTotalPages(1);
    loadShelves(selectedBranchId, 1, false);
  }, [selectedBranchId, loadShelves]);

  const highlightedShelfId = params?.shelfId;

  return (
    <ClientScreen go={go} active="map">
      <Head back="Volver" onBack={back} big title="Estantes y ubicaciones" subtitle="Ubicación de productos en la tienda" />

      {loadingBranches ? (
        <View style={{ marginTop: 16 }}><ActivityIndicator color={C.navy} /></View>
      ) : branches.length > 1 ? (
        <View style={{ marginTop: 16, gap: 8 }}>
          <SectionLabel>Sucursal</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {branches.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => setSelectedBranchId(b.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: selectedBranchId === b.id ? C.navy : C.border,
                  backgroundColor: selectedBranchId === b.id ? C.navy : C.field,
                }}
              >
                <Text style={{ color: selectedBranchId === b.id ? '#fff' : C.text, fontSize: 13 }}>{b.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={{ marginTop: 16 }}>
          <Info title="No pudimos cargar" text={error} />
          <Primary onPress={() => loadShelves(selectedBranchId, 1, false)}>Reintentar</Primary>
        </View>
      ) : null}

      {loadingShelves ? (
        <View style={{ marginTop: 16 }}><ActivityIndicator color={C.navy} /></View>
      ) : shelves.length === 0 && !error ? (
        <View style={{ marginTop: 16 }}>
          <Info title="Sin estantes" text="Esta sucursal aún no tiene estantes registrados." />
        </View>
      ) : (
        <View style={{ marginTop: 16, gap: 12 }}>
          {shelves.map((shelf) => {
            const highlighted = highlightedShelfId && String(highlightedShelfId) === String(shelf.id);
            return (
              <View
                key={shelf.id}
                style={{
                  borderWidth: highlighted ? 2 : 1,
                  borderColor: highlighted ? C.navy : C.border,
                  borderRadius: 12,
                  padding: 12,
                  backgroundColor: C.field,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>{shelf.name}</Text>
                {shelf.location ? (
                  <Text style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{shelf.location}</Text>
                ) : (
                  <Text style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Sin ubicación registrada</Text>
                )}
                <Text style={{ fontSize: 13, color: C.text, marginTop: 8 }}>
                  {shelf.product_count} producto{shelf.product_count === 1 ? '' : 's'}
                  {shelf.guide_count > 0 ? ` · ${shelf.guide_count} con guía` : ''}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <Primary variant="light" onPress={() => go('search', { shelfId: shelf.id })}>
                    Ver productos de este estante
                  </Primary>
                </View>
              </View>
            );
          })}

          {page < totalPages ? (
            <Primary loading={loadingMore} onPress={() => loadShelves(selectedBranchId, page + 1, true)}>
              Cargar más estantes
            </Primary>
          ) : null}
        </View>
      )}
    </ClientScreen>
  );
}