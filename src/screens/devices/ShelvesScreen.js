import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Shell, Copy, ErrorNotice, FieldCard, Info, LoadState, Primary, SectionLabel, useData, useDevices,
} from './DeviceUI';
import { describeError } from '../../utils/errorMessages';
import { useAuth } from '../../context/AuthContext';
import { canManage } from '../../utils/validation';
import { colors as C } from '../../theme/colors';

// Hub de repisa (ME-7 + ME-8, Parte A). Una sola tarjeta expandible reúne
// productos previstos, luces guía y cámara. No hay pantalla de detalle ni
// ruta nueva: se evita fragmentar la configuración en varios saltos.

function Badge({ children, muted = false }) {
  return <Text style={[S.badge, muted && S.badgeMuted]}>{children}</Text>;
}

function lightLabel(light) {
  return `LED ${(light.channel ?? 0) + 1}${light.name ? ` · ${light.name}` : ''}`;
}

function productStatus(product) {
  if (product.active === false) return 'Inactivo';
  return product.physicalConfigured ? 'Listo' : 'Falta medir';
}

function lightDetail(light) {
  const current = (light.products || [])[0];
  return current ? current.name : 'Sin producto';
}

// Panel de acciones: mantiene la pantalla limpia y deja las opciones para
// cuando la persona toca la fila que le interesa.
function Sheet({ visible, title, subtitle, onClose, children }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={S.sheetBackdrop} onPress={onClose}>
      <View style={S.sheet}>
        <Text style={S.sheetTitle}>{title}</Text>
        {subtitle ? <Text style={S.sheetSubtitle}>{subtitle}</Text> : null}
        <View style={S.sheetActions}>{children}</View>
        <Primary variant="light" onPress={onClose}>Cerrar</Primary>
      </View>
    </Pressable>
  </Modal>;
}

function CatalogPicker({ shelfId, assignedIds, onAdd, onClose, busy }) {
  const catalog = useData('listProducts');
  const options = (catalog.data || []).filter(product => !assignedIds.has(product.id));
  return <>
    <SectionLabel>Catálogo de la sucursal</SectionLabel>
    <LoadState state={catalog}>
      {options.map(product => <Pressable key={product.id} accessibilityRole="button"
        accessibilityLabel={`Agregar ${product.name}`} disabled={busy}
        onPress={() => onAdd(product.id)} style={({ pressed }) => [S.row, pressed && S.pressed]}>
        <View style={{ flex: 1 }}>
          <Text style={S.rowTitle}>{product.name}</Text>
          <Text style={S.rowDetail}>{`SKU · ${product.sku}`}</Text>
        </View>
        <Text style={S.rowAction}>Agregar</Text>
      </Pressable>)}
      {!options.length ? <Info>No quedan productos disponibles en el catálogo.</Info> : null}
    </LoadState>
    <Primary variant="light" disabled={busy} onPress={onClose}>Cerrar catálogo</Primary>
  </>;
}

function CameraPicker({ shelfId, onLink, onClose, busy }) {
  const devices = useData('listDevices');
  const cameras = (devices.data || []).filter(device => device.type === 'camera');
  return <>
    <SectionLabel>Elige la cámara de esta repisa</SectionLabel>
    <Copy>La cámara exige que los productos de la repisa tengan orientación y medidas. Si falta alguna, el sistema dirá cuál.</Copy>
    <LoadState state={devices}>
      {cameras.map(camera => <Pressable key={camera.id} accessibilityRole="button"
        accessibilityLabel={`Vincular ${camera.name || 'cámara'}`} disabled={busy}
        onPress={() => onLink(camera.id)} style={({ pressed }) => [S.row, pressed && S.pressed]}>
        <View style={{ flex: 1 }}>
          <Text style={S.rowTitle}>{camera.name || 'Cámara'}</Text>
          <Text style={S.rowDetail}>{camera.location || 'Sin ubicación'}</Text>
        </View>
        <Text style={S.rowAction}>Vincular</Text>
      </Pressable>)}
      {!cameras.length ? <Info>No hay cámaras registradas en la sucursal. Regístralas desde Dispositivos.</Info> : null}
    </LoadState>
    <Primary variant="light" disabled={busy} onPress={onClose}>Cancelar</Primary>
  </>;
}

function ShelfBody({ shelf, go, manage, onChanged }) {
  const d = useDevices();
  const detail = useData('readShelf', { shelfId: shelf.id });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [showCameras, setShowCameras] = useState(false);
  const [sheet, setSheet] = useState(null); // { type, id, view, value }
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shelf.name);
  const [location, setLocation] = useState(shelf.location || '');

  const data = detail.data || {};
  const products = data.products || [];
  const lights = data.lights || [];
  const assignedIds = new Set(products.map(product => product.id));
  const sheetProduct = sheet?.type === 'product' ? products.find(item => item.id === sheet.id) : null;
  const sheetLight = sheet?.type === 'light' ? lights.find(item => item.id === sheet.id) : null;
  const sheetLightProduct = (sheetLight?.products || [])[0];

  function closeSheet() {
    setSheet(null);
    setConfirmRemove(null);
  }

  async function run(key, action) {
    if (busy) return;
    setBusy(key); setError(''); setNotice('');
    try {
      await action();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setBusy('');
    }
  }

  function refresh(message) {
    setNotice(message);
    detail.reload();
    onChanged();
  }

  function addProduct(productId) {
    run('add', async () => {
      await d.mutate('addShelfProduct', { shelfId: shelf.id, productId });
      setShowCatalog(false);
      refresh('Producto agregado a la repisa.');
    });
  }

  function linkedLight(productId) {
    return lights.find(light => (light.products || []).some(item => item.id === productId));
  }

  function removeProduct(product) {
    const light = linkedLight(product.id);
    if (light && confirmRemove !== product.id) {
      setConfirmRemove(product.id);
      setError('');
      setNotice('');
      return;
    }
    run(`remove:${product.id}`, async () => {
      // Primero se retira la asociación (el backend bloquea si hay una guía
      // activa) y después el producto de la repisa con confirmación explícita.
      // Así no queda una luz apuntando a un producto que ya no está aquí.
      if (light) await d.mutate('unassignGuideProduct', { productId: product.id });
      await d.mutate('removeShelfProduct', {
        shelfId: shelf.id, productId: product.id, withLight: !!light,
      });
      closeSheet();
      refresh(light ? 'Producto y luz retirados.' : 'Producto retirado de la repisa.');
    });
  }

  function assignToLight(light, productId) {
    run(`assign:${light.id}`, async () => {
      await d.mutate('assignGuideProduct', {
        productId, guidePointId: light.id,
        replaceProductId: sheetLightProduct?.id,
      });
      closeSheet();
      refresh('Producto asociado a la luz.');
    });
  }

  function unassignLightProduct(productId) {
    run(`unassign:${productId}`, async () => {
      await d.mutate('unassignGuideProduct', { productId });
      closeSheet();
      refresh('La luz ya no tiene producto asignado.');
    });
  }

  function testLight(light) {
    run(`test:${light.id}`, async () => {
      const result = await d.mutate('testLight', {
        deviceId: light.nodeId, channel: light.channel, durationSeconds: 10,
      });
      closeSheet();
      setNotice(result.status === 'applied'
        ? `Envío aceptado para ${lightLabel(light)}; comprueba la luz (10 s).`
        : result.status === 'rejected'
          ? 'La luz no aceptó la prueba. Comprueba que el canal no esté ocupado.'
          : 'La luz pudo no encender; comprueba el resultado.');
    });
  }

  function saveLight(light) {
    const value = (sheet?.value || '').trim();
    if (!value) return;
    run(`light:${light.id}`, async () => {
      await d.mutate('updateLight', {
        deviceId: light.nodeId, lightId: light.id, name: value,
        shelfId: shelf.id, channel: light.channel,
      });
      closeSheet();
      refresh('Nombre de la luz actualizado.');
    });
  }

  function saveShelf() {
    if (!name.trim()) return;
    run('shelf', async () => {
      await d.mutate('updateShelf', { shelfId: shelf.id, name: name.trim(), location: location.trim() || null });
      setEditing(false);
      refresh('Repisa actualizada.');
    });
  }

  function linkCamera(deviceId) {
    run('camera', async () => {
      await d.mutate('linkShelf', { deviceId, shelfId: shelf.id });
      setShowCameras(false);
      refresh('Cámara vinculada a la repisa.');
    });
  }

  function removeShelf() {
    run('delete', async () => {
      await d.mutate('deleteShelf', { shelfId: shelf.id });
      onChanged();
    });
  }

  return <View style={S.body}>
    <ErrorNotice message={error} />
    {notice ? <Info title="Listo">{notice}</Info> : null}

    <LoadState state={detail}>
      <SectionLabel>Productos previstos</SectionLabel>
      {products.map(product => <Pressable key={product.id} accessibilityRole="button"
        accessibilityLabel={`Ver opciones de ${product.name}`}
        onPress={() => setSheet({ type: 'product', id: product.id })}
        style={({ pressed }) => [S.row, pressed && S.pressed]}>
        <View style={{ flex: 1 }}>
          <Text style={S.rowTitle}>{product.name}</Text>
          <Text style={S.rowDetail}>{`${product.sku || ''} · ${productStatus(product)}`}</Text>
        </View>
        <Text style={S.rowChevron}>›</Text>
      </Pressable>)}
      {!products.length ? <Info>Aún no hay productos en esta repisa.</Info> : null}
      {manage ? (!showCatalog
        ? <Primary variant="light" disabled={!!busy} onPress={() => setShowCatalog(true)}>Agregar producto desde el catálogo</Primary>
        : <CatalogPicker shelfId={shelf.id} assignedIds={assignedIds} busy={!!busy}
            onAdd={addProduct} onClose={() => setShowCatalog(false)} />) : null}

      <SectionLabel>Luces guía</SectionLabel>
      {lights.map(light => <Pressable key={light.id} accessibilityRole="button"
        accessibilityLabel={`Ver opciones de ${lightLabel(light)}`}
        onPress={() => setSheet({ type: 'light', id: light.id })}
        style={({ pressed }) => [S.row, pressed && S.pressed]}>
        <View style={{ flex: 1 }}>
          <Text style={S.rowTitle}>{lightLabel(light)}</Text>
          <Text style={S.rowDetail}>{lightDetail(light)}</Text>
        </View>
        <Text style={S.rowChevron}>›</Text>
      </Pressable>)}
      {!lights.length ? <Info>Esta repisa no tiene luces guía. Se configuran desde Dispositivos → guía LED.</Info> : null}

      <SectionLabel>Cámara y zonas</SectionLabel>
      {data.cameraNodeId ? <>
        <Text style={S.rowTitle}>{data.cameraName || 'Cámara vinculada'}</Text>
        <Primary variant="light" onPress={() => {
          d.selectDevice({ id: data.cameraNodeId, name: data.cameraName || 'Cámara', type: 'camera' });
          go('shelf-zones');
        }}>Ver zonas (ROI)</Primary>
      </> : <>
        <Copy>Sin cámara. Vincular una cámara no requiere mapa 2D, pero sí productos con medidas.</Copy>
        {manage ? (!showCameras
          ? <Primary variant="light" disabled={!!busy} onPress={() => setShowCameras(true)}>Vincular cámara</Primary>
          : <CameraPicker shelfId={shelf.id} busy={!!busy} onLink={linkCamera}
              onClose={() => setShowCameras(false)} />) : null}
      </>}

      {manage ? <>
        <SectionLabel>Repisa</SectionLabel>
        {!editing ? <Primary variant="light" disabled={!!busy} onPress={() => setEditing(true)}>Editar nombre y ubicación</Primary> : <>
          <FieldCard label="Nombre" value={name} editable={!busy} onChangeText={setName} />
          <FieldCard label="Ubicación (texto)" value={location} editable={!busy} onChangeText={setLocation} />
          <Primary disabled={!!busy || !name.trim()} loading={busy === 'shelf'} onPress={saveShelf}>Guardar cambios</Primary>
          <Primary variant="light" disabled={!!busy} onPress={() => {
            setEditing(false); setName(shelf.name); setLocation(shelf.location || '');
          }}>Cancelar</Primary>
        </>}
        <Primary variant="danger" disabled={!!busy} loading={busy === 'delete'} onPress={removeShelf}>
          Eliminar repisa
        </Primary>
        <Copy>Si la repisa tiene zonas o luces, el sistema dirá qué lo impide antes de borrarla.</Copy>
      </> : null}
    </LoadState>

    <Sheet visible={!!sheetProduct} title={sheetProduct?.name || ''}
      subtitle={sheetProduct ? `${sheetProduct.sku || ''} · ${productStatus(sheetProduct)}` : ''}
      onClose={closeSheet}>
      {sheetProduct ? <>
        {linkedLight(sheetProduct.id)
          ? <Copy>{`Está en ${lightLabel(linkedLight(sheetProduct.id))}`}</Copy> : null}
        {manage && !sheetProduct.physicalConfigured
          ? <Primary variant="light" onPress={() => {
              closeSheet();
              go('products', { productId: sheetProduct.id });
            }}>Completar tamaño y posición</Primary> : null}
        {manage && confirmRemove === sheetProduct.id ? <>
          <Info title="Este producto tiene una luz asociada">
            Si lo quitas solo de la repisa, la luz seguiría apuntando a un producto que ya no está aquí.
          </Info>
          <Primary variant="danger" disabled={!!busy} loading={busy === `remove:${sheetProduct.id}`}
            onPress={() => removeProduct(sheetProduct)}>Quitar repisa y luz</Primary>
          <Primary variant="light" disabled={!!busy} onPress={() => setConfirmRemove(null)}>Cancelar</Primary>
        </> : manage ? <Primary variant="danger" disabled={!!busy}
          onPress={() => removeProduct(sheetProduct)}>Quitar de la repisa</Primary> : null}
      </> : null}
    </Sheet>

    <Sheet visible={!!sheetLight && sheet?.view !== 'products' && sheet?.view !== 'name'}
      title={sheetLight ? lightLabel(sheetLight) : ''} subtitle={sheetLight ? lightDetail(sheetLight) : ''}
      onClose={closeSheet}>
      {sheetLight ? <>
        <Primary disabled={!!busy} loading={busy === `test:${sheetLight.id}`}
          onPress={() => testLight(sheetLight)}>Encender 10 s</Primary>
        {manage ? <Primary variant="light" disabled={!!busy}
          onPress={() => setSheet({ ...sheet, view: 'products' })}>
          {sheetLightProduct ? 'Cambiar producto' : 'Asignar producto'}
        </Primary> : null}
        {manage && sheetLightProduct ? <Primary variant="light" disabled={!!busy}
          onPress={() => unassignLightProduct(sheetLightProduct.id)}>Dejar sin producto</Primary> : null}
        {manage ? <Primary variant="light" disabled={!!busy}
          onPress={() => setSheet({ ...sheet, view: 'name', value: sheetLight.name || '' })}>Cambiar nombre</Primary> : null}
      </> : null}
    </Sheet>

    <Sheet visible={sheet?.type === 'light' && sheet?.view === 'products'}
      title="Elige un producto" subtitle={sheetLight ? lightLabel(sheetLight) : ''} onClose={closeSheet}>
      {products.filter(product => product.id !== sheetLightProduct?.id).map(product =>
        <Pressable key={product.id} accessibilityRole="button"
          accessibilityLabel={`Asociar ${product.name}`} disabled={!!busy}
          onPress={() => assignToLight(sheetLight, product.id)}
          style={({ pressed }) => [S.row, pressed && S.pressed]}>
          <View style={{ flex: 1 }}>
            <Text style={S.rowTitle}>{product.name}</Text>
            <Text style={S.rowDetail}>{product.sku}</Text>
          </View>
          <Text style={S.rowChevron}>›</Text>
        </Pressable>)}
      {!products.length ? <Info>Agrega el producto a la repisa antes de asignarlo a una luz.</Info> : null}
    </Sheet>

    <Sheet visible={sheet?.type === 'light' && sheet?.view === 'name'}
      title="Nombre de la luz" onClose={closeSheet}>
      {sheetLight ? <>
        <FieldCard label="Nombre" value={sheet.value || ''} editable={!busy}
          onChangeText={value => setSheet({ ...sheet, value })} />
        <Primary disabled={!!busy || !(sheet.value || '').trim()} loading={busy === `light:${sheetLight.id}`}
          onPress={() => saveLight(sheetLight)}>Guardar nombre</Primary>
      </> : null}
    </Sheet>
  </View>;
}

function ShelfCard({ shelf, expanded, onToggle, go, manage, onChanged }) {
  return <View style={S.card}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
      accessibilityLabel={`${expanded ? 'Contraer' : 'Expandir'} ${shelf.name}`}
      onPress={onToggle} style={({ pressed }) => [S.cardHead, pressed && S.pressed]}>
      <View style={{ flex: 1 }}>
        <Text style={S.cardTitle}>{shelf.name}</Text>
        <Text style={S.cardDetail}>{shelf.location || 'Sin ubicación textual'}</Text>
      </View>
      <Text style={S.chevron}>{expanded ? '⌄' : '›'}</Text>
    </Pressable>
    <View style={S.badges}>
      <Badge>{`${shelf.productCount} productos`}</Badge>
      <Badge muted={!shelf.lightCount}>{shelf.lightCount ? `${shelf.lightCount} LED` : 'Sin LED'}</Badge>
      <Badge muted={!shelf.cameraName}>{shelf.cameraName ? `Cámara: ${shelf.cameraName}` : 'Sin cámara'}</Badge>
    </View>
    {expanded ? <ShelfBody shelf={shelf} go={go} manage={manage} onChanged={onChanged} /> : null}
  </View>;
}

export default function ShelvesScreen({ go, params }) {
  const d = useDevices();
  const { user } = useAuth();
  const manage = canManage(user);
  const state = useData('listShelves');
  const [openId, setOpenId] = useState(params?.shelfId || null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (busy || !name.trim()) return;
    setBusy(true); setError(''); setSaved('');
    try {
      const result = await d.mutate('createBranchShelf', { name: name.trim(), location: location.trim() || null });
      setName(''); setLocation(''); setShowForm(false);
      setSaved('Repisa creada. Ábrela para agregar productos.');
      if (result?.id) setOpenId(result.id);
      state.reload();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally { setBusy(false); }
  }

  return <Shell go={go} title="Estantes"
    subtitle={manage ? 'Repisas, productos, luces y cámara en un solo lugar' : 'Consulta repisas, productos y luces'}>
    <ErrorNotice message={error} />
    {saved ? <Info title="Listo">{saved}</Info> : null}

    {manage ? (!showForm
      ? <Primary variant="light" onPress={() => setShowForm(true)}>Crear repisa</Primary>
      : <>
        <SectionLabel>Nueva repisa</SectionLabel>
        <FieldCard label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Repisa 1" />
        <FieldCard label="Ubicación (texto)" value={location} onChangeText={setLocation} placeholder="Ej. Pasillo central, lado izquierdo" />
        <Primary onPress={create} loading={busy} disabled={!name.trim()}>Guardar repisa</Primary>
        <Primary variant="light" onPress={() => setShowForm(false)}>Cancelar</Primary>
      </>) : null}

    <SectionLabel>Repisas de la sucursal</SectionLabel>
    <LoadState state={state}>
      {(state.data || []).map(shelf => <ShelfCard key={shelf.id} shelf={shelf} manage={manage} go={go}
        expanded={openId === shelf.id} onChanged={state.reload}
        onToggle={() => setOpenId(openId === shelf.id ? null : shelf.id)} />)}
      {!(state.data || []).length ? <Info>No hay repisas registradas. Crea la primera para empezar.</Info> : null}
    </LoadState>

    <Info title="Antes de empezar">
      Primero crea el producto en Productos y luego agrégalo a la repisa. La cámara solo se conecta cuando cada producto ya tiene anotados su tamaño y su posición.
    </Info>
  </Shell>;
}

const S = StyleSheet.create({
  card: { backgroundColor: C.field, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: C.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.7 },
  cardTitle: { color: C.navy, fontSize: 17, fontWeight: '600' },
  cardDetail: { color: C.muted, fontSize: 13, marginTop: 2 },
  chevron: { color: C.muted, fontSize: 22 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { backgroundColor: C.blue, color: C.navy, fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  badgeMuted: { backgroundColor: C.border, color: C.muted },
  body: { gap: 12, paddingTop: 4 },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: '500' },
  rowDetail: { color: C.muted, fontSize: 13 },
  rowChevron: { color: C.muted, fontSize: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  rowAction: { color: C.navy, fontSize: 13, fontWeight: '600' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.field, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, gap: 12 },
  sheetTitle: { color: C.navy, fontSize: 18, fontWeight: '700' },
  sheetSubtitle: { color: C.muted, fontSize: 13 },
  sheetActions: { gap: 8 },
});
