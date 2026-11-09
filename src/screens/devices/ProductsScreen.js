import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Shell, ErrorNotice, LoadState, useData, useDevices, FieldCard, Primary, Info, SectionLabel } from './DeviceUI';
import { describeError } from '../../utils/errorMessages';
import { colors as C } from '../../theme/colors';

function ProductRow({ product }) {
  return <View style={styles.row}>
    <View style={{ flex: 1 }}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.sku}>SKU · {product.sku}</Text>
    </View>
    <Text style={[styles.badge, product.active ? styles.active : styles.inactive]}>
      {product.active ? 'Activo' : 'Inactivo'}
    </Text>
  </View>;
}

export default function ProductsScreen({ go }) {
  const d = useDevices();
  const state = useData('listProducts');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

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

  return <Shell go={go} title="Productos" subtitle="Catálogo disponible para asignar a las zonas." back="panel">
    <TextInput
      accessibilityLabel="Buscar productos"
      value={search}
      onChangeText={setSearch}
      placeholder="Buscar por nombre o SKU"
      placeholderTextColor={C.mutedSoft}
      autoCapitalize="none"
      style={styles.search}
    />

    {saved ? <Info title="Producto creado">{saved}</Info> : null}
    <ErrorNotice message={error} />

    <SectionLabel>Catálogo ({products.length})</SectionLabel>
    <LoadState state={state}>
      {products.length === 0
        ? <Info>{query ? 'Ningún producto coincide con la búsqueda.' : 'Todavía no hay productos en esta sucursal.'}</Info>
        : products.map(product => <ProductRow key={product.id} product={product} />)}
    </LoadState>
    <Primary variant="light" onPress={state.reload}>Actualizar catálogo</Primary>

    <SectionLabel>Agregar producto</SectionLabel>
    {showForm ? <>
      <FieldCard label="SKU" value={sku} onChangeText={value => { setSku(value); setSaved(''); }} placeholder="Ej. SKU-001" editable={!busy} autoCapitalize="characters" />
      <FieldCard label="Nombre del producto" value={name} onChangeText={value => { setName(value); setSaved(''); }} placeholder="Ej. Agua natural 600 ml" editable={!busy} />
      <Primary loading={busy} loadingLabel="Guardando…" disabled={busy || !sku.trim() || !name.trim()} onPress={create}>Guardar producto</Primary>
      <Primary variant="light" disabled={busy} onPress={() => { setShowForm(false); setError(''); }}>Cancelar</Primary>
    </> : <Primary onPress={() => { setShowForm(true); setSaved(''); setError(''); }}>Nuevo producto</Primary>}

    <Info>Los productos se crean para la sucursal seleccionada y después se asignan a cada zona de la repisa.</Info>
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
