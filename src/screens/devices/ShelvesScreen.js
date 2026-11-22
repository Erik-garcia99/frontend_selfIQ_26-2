import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [picker, setPicker] = useState(null); // { lightId, replaceProductId }
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shelf.name);
  const [location, setLocation] = useState(shelf.location || '');
  const [editLight, setEditLight] = useState(null); // { id, value }

  const data = detail.data || {};
  const products = data.products || [];
  const lights = data.lights || [];
  const assignedIds = new Set(products.map(product => product.id));

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
      setConfirmRemove(null);
      refresh(light ? 'Producto y asociación del LED retirados.' : 'Producto retirado de la repisa.');
    });
  }

  function assignToLight(light, productId) {
    const current = (light.products || [])[0];
    run(`assign:${light.id}`, async () => {
      await d.mutate('assignGuideProduct', {
        productId, guidePointId: light.id,
        replaceProductId: current?.id,
      });
      setPicker(null);
      refresh('Producto asociado al LED.');
    });
  }

  function unassignLightProduct(productId) {
    run(`unassign:${productId}`, async () => {
      await d.mutate('unassignGuideProduct', { productId });
      refresh('Asociación del LED retirada.');
    });
  }

  function testLight(light) {
    run(`test:${light.id}`, async () => {
      const result = await d.mutate('testLight', {
        deviceId: light.nodeId, channel: light.channel, durationSeconds: 10,
      });
      setNotice(result.status === 'applied'
        ? `Envío aceptado para ${lightLabel(light)}; comprueba el LED (10 s).`
        : result.status === 'rejected'
          ? 'El nodo rechazó la prueba. Comprueba que el canal no esté en otra guía.'
          : 'El nodo no confirmó la prueba; el LED pudo no encender.');
    });
  }

  function saveLight(light) {
    const value = (editLight?.value || '').trim();
    if (!value) return;
    run(`light:${light.id}`, async () => {
      await d.mutate('updateLight', {
        deviceId: light.nodeId, lightId: light.id, name: value,
        shelfId: shelf.id, channel: light.channel,
      });
      setEditLight(null);
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
      {products.map(product => {
        const light = linkedLight(product.id);
        const confirming = confirmRemove === product.id;
        return <View key={product.id} style={S.block}>
          <Text style={S.rowTitle}>{product.name}</Text>
          <Text style={S.rowDetail}>{`${product.sku} · ${product.active === false
            ? 'Inactivo' : product.physicalConfigured ? 'Configurado' : 'Sin configurar'}`}</Text>
          {light ? <Copy>{`Asociado a ${lightLabel(light)}`}</Copy> : null}
          {manage ? <View style={S.actions}>
            {!product.physicalConfigured ? <Primary variant="light" disabled={!!busy}
              onPress={() => go('products', { productId: product.id })}>Configurar medidas</Primary> : null}
            {confirming ? <>
              <Info title="Este producto tiene un LED asociado">
                <Copy>Si lo quitas solo de la repisa, la luz seguiría apuntando a un producto que ya no está aquí. Al quitar ambos se retira también del resto de luces del producto.</Copy>
              </Info>
              <Primary variant="danger" disabled={!!busy} loading={busy === `remove:${product.id}`}
                onPress={() => removeProduct(product)}>Quitar repisa y asociación del LED</Primary>
              <Primary variant="light" disabled={!!busy} onPress={() => setConfirmRemove(null)}>Cancelar</Primary>
            </> : <Primary variant="light" disabled={!!busy}
              onPress={() => removeProduct(product)}>Quitar de la repisa</Primary>}
          </View> : null}
        </View>;
      })}
      {!products.length ? <Info>Aún no hay productos asignados a esta repisa.</Info> : null}
      {manage ? (!showCatalog
        ? <Primary variant="light" disabled={!!busy} onPress={() => setShowCatalog(true)}>Agregar producto desde el catálogo</Primary>
        : <CatalogPicker shelfId={shelf.id} assignedIds={assignedIds} busy={!!busy}
            onAdd={addProduct} onClose={() => setShowCatalog(false)} />) : null}

      <SectionLabel>Luces guía</SectionLabel>
      {lights.map(light => {
        const current = (light.products || [])[0];
        const editingThis = editLight?.id === light.id;
        return <View key={light.id} style={S.block}>
          <Text style={S.rowTitle}>{lightLabel(light)}</Text>
          <Text style={S.rowDetail}>{current ? current.name : 'Sin producto asociado'}</Text>
          <View style={S.actions}>
            {manage && !editingThis ? <Primary variant="light" disabled={!!busy}
              onPress={() => setEditLight({ id: light.id, value: light.name || '' })}>Editar nombre</Primary> : null}
            {manage && editingThis ? <>
              <FieldCard label="Nombre de la luz" value={editLight.value} editable={!busy}
                onChangeText={value => setEditLight({ id: light.id, value })} />
              <Primary disabled={!!busy} loading={busy === `light:${light.id}`}
                onPress={() => saveLight(light)}>Guardar nombre</Primary>
              <Primary variant="light" disabled={!!busy} onPress={() => setEditLight(null)}>Cancelar</Primary>
            </> : null}
            {manage && !editingThis ? <Primary variant="light" disabled={!!busy}
              onPress={() => setPicker(picker?.lightId === light.id ? null : { lightId: light.id, replaceProductId: current?.id })}>
              {current ? 'Cambiar producto' : 'Asignar producto'}
            </Primary> : null}
            {current && !editingThis ? <Primary variant="light" disabled={!!busy}
              onPress={() => unassignLightProduct(current.id)}>Quitar asociación</Primary> : null}
            <Primary variant="light" disabled={!!busy} loading={busy === `test:${light.id}`}
              onPress={() => testLight(light)}>Encender 10 s</Primary>
          </View>
          {picker?.lightId === light.id ? <View style={S.picker}>
            {products.filter(product => product.id !== current?.id).map(product =>
              <Pressable key={product.id} accessibilityRole="button"
                accessibilityLabel={`Asociar ${product.name} a ${lightLabel(light)}`} disabled={!!busy}
                onPress={() => assignToLight(light, product.id)}
                style={({ pressed }) => [S.row, pressed && S.pressed]}>
                <Text style={S.rowTitle}>{product.name}</Text>
                <Text style={S.rowDetail}>{product.sku}</Text>
              </Pressable>)}
            {!products.length ? <Info>Agrega el producto a la repisa antes de asociarlo a un LED.</Info> : null}
            {products.length && products.filter(product => product.id !== current?.id).length === 0
              ? <Info>No hay otro producto de esta repisa para asociar.</Info> : null}
          </View> : null}
        </View>;
      })}
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

    <Info title="Antes de instalar hardware">
      <Copy>Primero crea y configura el producto en Productos, luego asígnalo a una repisa. Un producto sin orientación ni medidas impide vincular la cámara. La guía LED se configura desde Dispositivos.</Copy>
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
  block: { gap: 6, paddingVertical: 4 },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: '500' },
  rowDetail: { color: C.muted, fontSize: 13 },
  actions: { gap: 8, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  rowAction: { color: C.navy, fontSize: 13, fontWeight: '600' },
  picker: { gap: 4, paddingTop: 4 },
});
