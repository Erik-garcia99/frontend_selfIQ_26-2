import { useState } from 'react';
import { Shell, Copy, ErrorNotice, FieldCard, Info, LoadState, NavRow, Primary, SectionLabel, useData, useDevices } from './DeviceUI';
import { describeError } from '../../utils/errorMessages';

function ShelfDetail({ shelfId, go, onBack }) {
  const d = useDevices();
  const detail = useData('readShelf', { shelfId });
  const products = useData('listShelfProducts', { shelfId });
  const catalog = useData('listProducts');
  const [showCatalog, setShowCatalog] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  const assigned = products.data || [];
  const assignedIds = new Set(assigned.map(product => product.id));
  const options = (catalog.data || []).filter(product => !assignedIds.has(product.id));
  const missing = assigned.filter(product => !product.physicalConfigured);
  const shelf = detail.data || {};
  const toShelves = (route) => { if (route === 'shelves') onBack(); else go(route); };

  async function add(productId) {
    if (busy) return;
    setBusy(true); setError(''); setSaved('');
    try {
      await d.mutate('addShelfProduct', { shelfId, productId });
      setShowCatalog(false);
      setSaved('Producto agregado a la repisa.');
      products.reload(); detail.reload();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally { setBusy(false); }
  }

  async function remove(productId) {
    if (busy) return;
    setBusy(true); setError(''); setSaved('');
    try {
      await d.mutate('removeShelfProduct', { shelfId, productId });
      setSaved('Producto retirado de la repisa.');
      products.reload(); detail.reload();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally { setBusy(false); }
  }

  return <Shell go={toShelves} back="shelves" title={shelf.name || 'Repisa'}
    subtitle={shelf.location || 'Sin ubicación textual'}>
    {missing.length > 0 ? <Info title="Configura los productos antes de asociar hardware">
      <Copy>Esta repisa tiene productos sin orientación ni medidas. Configúralos en Productos antes de vincular la ESP32-CAM o una luz guía; así la calibración parte de datos reales.</Copy>
      <Copy>{missing.map(product => `${product.name} (${product.sku})`).join(', ')}</Copy>
      <Primary onPress={() => go('products')}>Ir a Productos</Primary>
    </Info> : null}

    <ErrorNotice message={error} />
    {saved ? <Info title="Listo">{saved}</Info> : null}

    <SectionLabel>Productos previstos</SectionLabel>
    <LoadState state={products}>
      {(assigned.length ? assigned : []).map(product => <NavRow key={product.id}
        label={product.name} detail={`${product.sku} · ${product.physicalConfigured ? 'Configurado' : 'Sin configurar'}`}
        onPress={() => remove(product.id)} />)}
      {!assigned.length ? <Info>Aún no hay productos asignados a esta repisa.</Info> : null}
    </LoadState>
    <Copy>Toca un producto para retirarlo de la repisa. No cambia el inventario registrado.</Copy>

    {!showCatalog ? <Primary variant="light" onPress={() => setShowCatalog(true)}>Agregar producto desde el catálogo</Primary> : <>
      <SectionLabel>Catálogo de la sucursal</SectionLabel>
      <LoadState state={catalog}>
        {options.map(product => <NavRow key={product.id}
          label={product.name} detail={`${product.sku} · ${product.physicalConfigured ? 'Configurado' : 'Sin configurar'}`}
          onPress={() => add(product.id)} />)}
        {!options.length ? <Info>No quedan productos disponibles en el catálogo.</Info> : null}
      </LoadState>
      <Primary variant="light" onPress={() => setShowCatalog(false)}>Cerrar catálogo</Primary>
    </>}

    <Info title="Instalación">
      <Copy>Cuando tengas la cámara o el controlador LED, los asociarás desde Dispositivos. Las zonas y luces se mostrarán aquí como información.</Copy>
    </Info>
  </Shell>;
}

export default function ShelvesScreen({ go }) {
  const d = useDevices();
  const state = useData('listShelves');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (busy || !name.trim()) return;
    setBusy(true); setError(''); setSaved('');
    try {
      await d.mutate('createBranchShelf', { name: name.trim(), location: location.trim() || null });
      setName(''); setLocation(''); setShowForm(false);
      setSaved('Repisa creada. Ahora agrega los productos previstos.');
      state.reload();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally { setBusy(false); }
  }

  if (selected) return <ShelfDetail shelfId={selected} go={go} onBack={() => setSelected(null)} />;

  return <Shell go={go} title="Estantes" subtitle="Crea repisas y define qué producto se espera en cada una">
    <ErrorNotice message={error} />
    {saved ? <Info title="Listo">{saved}</Info> : null}

    {!showForm ? <Primary variant="light" onPress={() => setShowForm(true)}>Crear repisa</Primary> : <>
      <SectionLabel>Nueva repisa</SectionLabel>
      <FieldCard label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Repisa 1" />
      <FieldCard label="Ubicación (texto)" value={location} onChangeText={setLocation} placeholder="Ej. Pasillo central, lado izquierdo" />
      <Primary onPress={create} loading={busy} disabled={!name.trim()}>Guardar repisa</Primary>
      <Primary variant="light" onPress={() => setShowForm(false)}>Cancelar</Primary>
    </>}

    <SectionLabel>Repisas de la sucursal</SectionLabel>
    <LoadState state={state}>
      {(state.data || []).map(shelf => <NavRow key={shelf.id}
        label={shelf.name} detail={shelf.location || 'Sin ubicación'}
        onPress={() => setSelected(shelf.id)} />)}
      {!(state.data || []).length ? <Info>No hay repisas registradas. Crea la primera para empezar.</Info> : null}
    </LoadState>

    <Info title="Antes de instalar hardware">
      <Copy>Primero crea y configura el producto en Productos, luego asígnalo a una repisa. La cámara y las luces se vinculan después desde Dispositivos.</Copy>
    </Info>
  </Shell>;
}
