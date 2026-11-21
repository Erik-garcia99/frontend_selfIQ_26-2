import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Shell, ErrorNotice, LoadState, useData, useDevices, FieldCard, Primary, Info, SectionLabel } from './DeviceUI';
import { describeError } from '../../utils/errorMessages';
import { useAuth } from '../../context/AuthContext';
import { canManage } from '../../utils/validation';
import { colors as C } from '../../theme/colors';
import PhysicalConfigForm from './PhysicalConfigForm';

function ProductRow({ product, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Configurar ${product.name}`}
    onPress={onPress} style={styles.row}>
    <View style={{ flex: 1 }}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.sku}>SKU · {product.sku}</Text>
    </View>
    <Text style={[styles.badge, product.active ? styles.active : styles.inactive]}>
      {product.active ? 'Activo' : 'Inactivo'}
    </Text>
  </Pressable>;
}

export default function ProductsScreen({ go }) {
  const { branchId } = useDevices();
  const { accessToken } = useAuth();
  return <ProductsWorkspace key={`${branchId}:${accessToken}`} go={go} accessToken={accessToken} />;
}

function ProductsWorkspace({ go, accessToken }) {
  const d = useDevices();
  const { user } = useAuth();
  const state = useData('listProducts');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [selected, setSelected] = useState(null);

  const query = search.trim().toLowerCase();
  const products = (state.data || []).filter(product =>
    !query || product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query));

  async function create() {
    if (busy || !sku.trim() || !name.trim()) return;
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const result = await d.mutate('createProduct', { sku: sku.trim(), name: name.trim() });
      setSku('');
      setName('');
      setShowForm(false);
      setSaved(`Producto "${result.name}" creado.`);
      state.reload();
    } catch (failure) {
      const info = describeError(failure);
      setError(info.message);
    } finally {
      setBusy(false);
    }
  }

  if (selected) return <Shell go={route => route === 'products' ? setSelected(null) : go(route)}
    title="Configuración física" subtitle={selected.sku} back="products">
    <PhysicalConfigForm branchId={d.branchId} accessToken={accessToken} product={selected} onClose={() => setSelected(null)} />
  </Shell>;

  return <Shell go={go} title="Productos" subtitle="Selecciona un producto para configurar medidas y zonas." back="panel">
    <TextInput
      accessibilityLabel="Buscar productos"
      value={search}
      onChangeText={setSearch}
      placeholder="Buscar por nombre o SKU"
      placeholderTextColor={C.mutedSoft}
      autoCapitalize="none"
      style={styles.search}
    />

    {canManage(user) ? <Primary variant="light" onPress={() => {
      d.setDraft({ controlBack: 'products' });
      go('test-product-light');
    }}>Control de LED · ON / OFF</Primary> : null}

    {saved ? <Info title="Producto creado">{saved}</Info> : null}
    <ErrorNotice message={error} />

    <SectionLabel>Catálogo ({products.length})</SectionLabel>
    <LoadState state={state}>
      {products.length === 0
        ? <Info>{query ? 'Ningún producto coincide con la búsqueda.' : 'Todavía no hay productos en esta sucursal.'}</Info>
        : products.map(product => <ProductRow key={product.id} product={product} onPress={() => setSelected(product)} />)}
    </LoadState>
    <Primary variant="light" onPress={state.reload}>Actualizar catálogo</Primary>

    <SectionLabel>Agregar producto</SectionLabel>
    {showForm ? <>
      <FieldCard label="SKU" value={sku} onChangeText={value => { setSku(value); setSaved(''); }} placeholder="Ej. SKU-001" editable={!busy} autoCapitalize="characters" />
      <FieldCard label="Nombre del producto" value={name} onChangeText={value => { setName(value); setSaved(''); }} placeholder="Ej. Agua natural 600 ml" editable={!busy} />
      <Primary loading={busy} loadingLabel="Guardando…" disabled={busy || !sku.trim() || !name.trim()} onPress={create}>Guardar producto</Primary>
      <Primary variant="light" disabled={busy} onPress={() => { setShowForm(false); setError(''); }}>Cancelar</Primary>
    </> : <Primary onPress={() => { setShowForm(true); setSaved(''); setError(''); }}>Nuevo producto</Primary>}

    <Info>El catálogo y las medidas del producto se comparten en la organización. Las zonas y sus asociaciones pertenecen a la sucursal seleccionada.</Info>
  </Shell>;
}

const styles = StyleSheet.create({
  search: { height: 52, backgroundColor: C.field, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, color: C.ink, fontSize: 15 },
  row: { backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  name: { color: C.ink, fontSize: 15, fontWeight: '600' },
  sku: { color: C.muted, fontSize: 12, marginTop: 3 },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  active: { color: C.online, backgroundColor: C.navy },
  inactive: { color: C.muted, backgroundColor: C.border },
});
