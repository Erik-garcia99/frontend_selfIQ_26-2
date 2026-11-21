import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ClientScreen, Head, Info, Primary, SectionLabel } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import {
  getCustomerBranches,
  getCustomerCategories,
  getCustomerProducts,
} from '../../services/customerService';
import {
  cancelGuideRequest,
  confirmGuideRequest,
  createGuideRequest,
  getGuideRequest,
  GUIDE_TERMINAL,
  guideMessage,
} from '../../services/guideService';
import { colors as C } from '../../theme/colors';
import { layoutStyles as L } from '../../theme/layout';

const AVAILABILITY_CONFIG = {
  available: {
    label: 'Disponible en repisa',
    color: '#1B873F',
    bg: '#EAF8EE',
  },
  low: {
    label: 'Disponibilidad baja',
    color: '#B45309',
    bg: '#FEF3C7',
  },
  out_of_stock: {
    label: 'Agotado en repisa',
    color: C.danger,
    bg: '#FDE8E8',
  },
  no_data: {
    label: 'Sin información reciente',
    color: C.muted,
    bg: '#EEF3F7',
  },
};

export default function CustomerSearchScreen({ go, back, params }) {
  const { accessToken } = useAuth();

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 5;
  const [shelfFilter, setShelfFilter] = useState(params?.shelfId || null);

  // Sincronizar filtro de estante cuando cambian los parámetros de navegación
  useEffect(() => {
    if (!params?.shelfId) return;
    let isCurrent = true;
    Promise.resolve().then(() => {
      if (isCurrent) setShelfFilter(params.shelfId);
    });
    return () => { isCurrent = false; };
  }, [params]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState(null);

  // Estado de la Guía LED activa
  const [activeGuideProduct, setActiveGuideProduct] = useState(null);
  const [guideState, setGuideState] = useState(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);

  const pollTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // Debounce del término de búsqueda (300 ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cargar sucursal inicial
  useEffect(() => {
    if (!accessToken) return;
    let isCurrent = true;
    getCustomerBranches(accessToken, { page: 1, pageSize: 5 })
      .then((data) => {
        if (!isCurrent) return;
        const items = data.items || [];
        setBranches(items);
        if (items.length > 0) {
          setSelectedBranchId((prev) => prev || items[0].id);
        }
      })
      .catch(() => {});
    return () => { isCurrent = false; };
  }, [accessToken]);

  // Cargar categorías cuando haya sucursal
  useEffect(() => {
    if (!accessToken || !selectedBranchId) return;
    let isCurrent = true;
    getCustomerCategories(accessToken, selectedBranchId)
      .then((data) => {
        if (!isCurrent) return;
        setCategories(data.categories || []);
      })
      .catch(() => {});
    return () => { isCurrent = false; };
  }, [accessToken, selectedBranchId]);

  // Buscar productos al cambiar query, categoría o sucursal
  const search = useCallback(async () => {
    if (!accessToken || !selectedBranchId) return;
    setLoadingProducts(true);
    setError(null);
    try {
      const data = await getCustomerProducts(accessToken, selectedBranchId, {
        q: debouncedQuery,
        category: selectedCategory,
        page,
        pageSize,
      });
      let items = data.items || [];
      if (shelfFilter) {
        items = items.filter((p) => String(p.shelf_id) === String(shelfFilter));
      }
      setProducts(items);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.message || 'No se pudieron consultar los productos.');
    } finally {
      setLoadingProducts(false);
    }
  }, [accessToken, selectedBranchId, debouncedQuery, selectedCategory, page, pageSize, shelfFilter]);

  useEffect(() => {
    let isCurrent = true;
    Promise.resolve().then(() => {
      if (isCurrent) search();
    });
    return () => { isCurrent = false; };
  }, [search]);

  // Resetear a la primera página cuando cambian los filtros
  useEffect(() => {
    let isCurrent = true;
    Promise.resolve().then(() => {
      if (isCurrent) setPage(1);
    });
    return () => { isCurrent = false; };
  }, [debouncedQuery, selectedCategory, shelfFilter]);

  // Limpieza de timers de guía al desmontar
  const stopGuideTimers = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    pollTimerRef.current = null;
    countdownTimerRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopGuideTimers();
  }, [stopGuideTimers]);

  // Iniciar Guía LED
  const handleStartGuide = async (product) => {
    if (!accessToken || !selectedBranchId) return;
    stopGuideTimers();
    setActiveGuideProduct(product);
    setGuideLoading(true);
    setGuideError(null);
    setGuideState(null);
    setTimeLeft(60);

    try {
      const initial = await createGuideRequest({
        branchId: selectedBranchId,
        productId: product.id,
        accessToken,
      });
      setGuideState(initial);
      setGuideLoading(false);

      // Iniciar cuenta regresiva (60 s)
      const expireTime = Date.now() + 60000;
      countdownTimerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((expireTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          stopGuideTimers();
        }
      }, 1000);

      // Polling cada 1.5 s para actualizar estado del LED
      const reqId = initial.id;
      pollTimerRef.current = setInterval(async () => {
        try {
          const current = await getGuideRequest({
            branchId: selectedBranchId,
            requestId: reqId,
            accessToken,
          });
          setGuideState(current);
          if (GUIDE_TERMINAL.has(current.status)) {
            stopGuideTimers();
          }
        } catch {
          // Ignorar fallo de un tick
        }
      }, 1500);
    } catch (err) {
      setGuideLoading(false);
      stopGuideTimers();
      if (err.status === 409 || err.code === 'guide_channel_busy') {
        setGuideError('La luz de esta repisa está en uso por otro cliente. Inténtalo en unos segundos.');
      } else {
        setGuideError(err.message || 'No se pudo iniciar la guía luminosa.');
      }
    }
  };

  // Confirmar que encontró el producto ("Ya lo encontré")
  const handleConfirmGuide = async () => {
    if (!accessToken || !selectedBranchId || !guideState?.id) {
      stopGuideTimers();
      setActiveGuideProduct(null);
      return;
    }
    stopGuideTimers();
    try {
      await confirmGuideRequest({
        branchId: selectedBranchId,
        requestId: guideState.id,
        accessToken,
      });
    } catch {}
    setActiveGuideProduct(null);
  };

  // Cancelar la guía
  const handleCancelGuide = async () => {
    if (!accessToken || !selectedBranchId || !guideState?.id) {
      stopGuideTimers();
      setActiveGuideProduct(null);
      return;
    }
    stopGuideTimers();
    try {
      await cancelGuideRequest({
        branchId: selectedBranchId,
        requestId: guideState.id,
        accessToken,
      });
    } catch {}
    setActiveGuideProduct(null);
  };

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  return (
    <ClientScreen go={go} active="search">
      <Head
        back="Volver"
        onBack={back}
        big
        title="Buscar"
        subtitle={
          selectedBranch?.name
            ? `Catálogo en ${selectedBranch.name}`
            : 'Encuentra productos y enciende su luz en repisa'
        }
      />

      {/* Barra de búsqueda */}
      <View style={{ marginTop: 18 }}>
        <View style={styles.searchBarWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, código o producto…"
            placeholderTextColor={C.mutedSoft}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Buscar productos"
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Borrar búsqueda"
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Categorías (chips horizontales) */}
      {categories.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            <Pressable
              onPress={() => setSelectedCategory('')}
              style={[
                styles.categoryChip,
                !selectedCategory && styles.categoryChipActive,
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.categoryChipText,
                  !selectedCategory && styles.categoryChipTextActive,
                ]}
              >
                Todas
              </Text>
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Lista de resultados */}
      <View style={{ marginTop: 16 }}>
        {shelfFilter ? (
          <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, color: C.muted }}>Filtrando por estante seleccionado</Text>
            <Pressable onPress={() => setShelfFilter(null)}>
              <Text style={{ color: C.navy, fontSize: 13, fontWeight: '600' }}>Ver todos</Text>
            </Pressable>
          </View>
        ) : null}
        <SectionLabel>
          {loadingProducts
            ? 'Buscando productos…'
            : debouncedQuery
            ? `Resultados para "${debouncedQuery}" (${products.length})`
            : selectedCategory
            ? `Categoría: ${selectedCategory} (${products.length})`
            : `Productos en tienda (${products.length})`}
        </SectionLabel>

        {error ? (
          <View style={[L.cardSoft, { borderColor: C.danger, borderWidth: 1 }]}>
            <Text style={[L.cardTitle, { color: C.danger }]}>Error</Text>
            <Text style={L.cardText}>{error}</Text>
            <Primary variant="light" onPress={search}>
              Reintentar
            </Primary>
          </View>
        ) : loadingProducts ? (
          <View style={[L.cardSoft, styles.centerRow, { paddingVertical: 32 }]}>
            <ActivityIndicator size="small" color={C.navy} />
            <Text style={[L.cardText, { marginLeft: 10 }]}>Consultando catálogo…</Text>
          </View>
        ) : products.length === 0 ? (
          <Info
            title="No encontramos productos"
            text={
              debouncedQuery || selectedCategory
                ? 'Prueba con otra palabra o selecciona una categoría diferente.'
                : 'Aún no hay productos registrados en esta sucursal.'
            }
          />
        ) : (
          products.map((p) => {
            const avail = AVAILABILITY_CONFIG[p.availability] || AVAILABILITY_CONFIG.no_data;
            const isOutOfStock = p.availability === 'out_of_stock';
            const priceFormatted = Number(p.sale_price || 0).toLocaleString('es-MX', {
              style: 'currency',
              currency: 'MXN',
            });

            return (
              <View key={p.id} style={L.cardSoft}>
                <View style={styles.productHeaderRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.productName}>{p.name}</Text>
                    {p.category ? (
                      <Text style={styles.productCategory}>{p.category}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.productPrice}>{priceFormatted}</Text>
                </View>

                {/* Ubicación de estante */}
                <View style={styles.locationRow}>
                  <Text style={styles.locationText}>
                    📍 {p.shelf_name || 'Estante'}
                    {p.location_label ? ` · ${p.location_label}` : ''}
                  </Text>
                  {p.shelf_id ? (
                    <Pressable onPress={() => go('map', { shelfId: p.shelf_id })} accessibilityRole="button">
                      <Text style={{ color: C.navy, fontSize: 13, marginLeft: 8 }}>Ver ubicación</Text>
                    </Pressable>
                  ) : null}
                </View>

                {/* Chip de disponibilidad */}
                <View style={styles.availRow}>
                  <View style={[styles.availChip, { backgroundColor: avail.bg }]}>
                    <View style={[styles.availDot, { backgroundColor: avail.color }]} />
                    <Text style={[styles.availText, { color: avail.color }]}>
                      {p.availability_label || avail.label}
                    </Text>
                  </View>
                </View>

                {/* Acción de Guía Luminosa LED (F-13) */}
                <View style={{ marginTop: 12 }}>
                  {p.has_guide && !isOutOfStock ? (
                    <Pressable
                      onPress={() => handleStartGuide(p)}
                      style={({ pressed }) => [
                        styles.guideButton,
                        pressed && { opacity: 0.8 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Encender luz para ${p.name}`}
                    >
                      <Text style={styles.guideButtonText}>💡 Guiar con luz LED</Text>
                    </Pressable>
                  ) : isOutOfStock ? (
                    <Text style={styles.disabledNote}>
                      Agotado en repisa · Consulta con el personal de la tienda
                    </Text>
                  ) : (
                    <Text style={styles.disabledNote}>
                      Sin luz asignada · Ubícalo directamente en el estante
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        {totalPages > 1 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                onPress={() => setPage(n)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: page === n ? C.navy : C.border,
                  backgroundColor: page === n ? C.navy : C.field,
                }}
              >
                <Text style={{ color: page === n ? '#fff' : C.text, fontSize: 13 }}>{n}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Modal / Hoja de Guía Luminosa Activa (MC-5 / F-13) */}
      <Modal
        visible={!!activeGuideProduct}
        animationType="slide"
        transparent
        onRequestClose={handleCancelGuide}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.guideIconWrap}>
              <Text style={{ fontSize: 36 }}>💡</Text>
            </View>

            <Text style={styles.guideTitle}>
              {guideLoading ? 'Activando luz…' : 'Siguiendo la luz'}
            </Text>

            <Text style={styles.guideSubtitle}>
              {activeGuideProduct?.name || 'Producto'}
            </Text>

            {guideError ? (
              <View style={styles.guideErrorBox}>
                <Text style={styles.guideErrorText}>{guideError}</Text>
                <View style={{ height: 12 }} />
                <Primary variant="light" onPress={() => setActiveGuideProduct(null)}>
                  Cerrar
                </Primary>
              </View>
            ) : guideLoading ? (
              <View style={[styles.centerRow, { paddingVertical: 20 }]}>
                <ActivityIndicator size="large" color={C.navy} />
                <Text style={[L.cardText, { marginLeft: 12 }]}>
                  Enviando orden al estante…
                </Text>
              </View>
            ) : (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <View style={styles.destinationBox}>
                  <Text style={styles.destinationTitle}>Dirígete a:</Text>
                  <Text style={styles.destinationShelf}>
                    {guideState?.shelf_name || activeGuideProduct?.shelf_name || 'Estante asignado'}
                  </Text>
                  {guideState?.location_reference || activeGuideProduct?.location_label ? (
                    <Text style={styles.destinationLocation}>
                      {guideState?.location_reference || activeGuideProduct?.location_label}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.guideStatusMessage}>
                  {guideMessage(guideState)}
                </Text>

                <View style={styles.countdownRow}>
                  <Text style={styles.countdownLabel}>Tiempo restante de la luz:</Text>
                  <Text style={styles.countdownNumber}>{timeLeft} s</Text>
                </View>

                <View style={{ width: '100%', marginTop: 18, gap: 10 }}>
                  <Primary onPress={handleConfirmGuide}>
                    Ya lo encontré
                  </Primary>
                  <Primary variant="light" onPress={handleCancelGuide}>
                    Cancelar guía
                  </Primary>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ClientScreen>
  );
}

const styles = StyleSheet.create({
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 14,
    color: C.ink,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: C.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  categoriesScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryChipActive: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.ink,
  },
  categoryChipTextActive: {
    color: C.white,
  },
  productHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.navy,
    lineHeight: 20,
  },
  productCategory: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
  },
  locationRow: {
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.muted,
  },
  availRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  availChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  availDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  availText: {
    fontSize: 11,
    fontWeight: '600',
  },
  guideButton: {
    backgroundColor: C.navy,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },
  disabledNote: {
    fontSize: 11,
    color: C.muted,
    fontStyle: 'italic',
    paddingVertical: 4,
  },

  // Modal / Hoja de Guía
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 29, 57, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  guideIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.navy,
  },
  guideSubtitle: {
    fontSize: 14,
    color: C.muted,
    marginTop: 2,
    marginBottom: 14,
  },
  destinationBox: {
    width: '100%',
    backgroundColor: '#EDF5FA',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  destinationTitle: {
    fontSize: 11,
    color: C.muted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  destinationShelf: {
    fontSize: 18,
    fontWeight: '700',
    color: C.navy,
    marginTop: 2,
  },
  destinationLocation: {
    fontSize: 13,
    color: C.ink,
    marginTop: 2,
  },
  guideStatusMessage: {
    fontSize: 13,
    color: C.ink,
    textAlign: 'center',
    marginVertical: 6,
    fontWeight: '500',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
  },
  countdownLabel: {
    fontSize: 12,
    color: C.muted,
  },
  countdownNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: C.navy,
  },
  guideErrorBox: {
    width: '100%',
    backgroundColor: '#FDE8E8',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  guideErrorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
