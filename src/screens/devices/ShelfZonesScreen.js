import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Shell, ErrorNotice, LoadState, Primary, Info, NavRow, SectionLabel, useData, useDevices } from './DeviceUI';
import { useAuth } from '../../context/AuthContext';
import { deviceAdapter } from '../../services/deviceAdapter';
import { colors as C } from '../../theme/colors';

const MAX_ZONES = 8;
const MIN_SIDE = 0.03;
const DEFAULT_SIDE = 0.15;
const OVERLAP_LIMIT = 0.02;

function newId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function zonesOverlap(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  if (right <= left || bottom <= top) return 0;
  const smaller = Math.min(a.w * a.h, b.w * b.h);
  if (smaller <= 0) return 0;
  return ((right - left) * (bottom - top)) / smaller;
}

function validateZones(zones) {
  if (zones.length > MAX_ZONES) return `Máximo ${MAX_ZONES} zonas por cámara.`;
  const ids = new Set();
  for (const zone of zones) {
    if (!zone.productId) return 'Cada zona necesita un producto asignado.';
    if (zone.w < MIN_SIDE || zone.h < MIN_SIDE) return 'Haz la zona un poco más grande.';
    if (zone.x < 0 || zone.y < 0 || zone.x + zone.w > 1 || zone.y + zone.h > 1) return 'Mantén todas las zonas dentro de la foto.';
    if (ids.has(zone.id)) return 'Hay una zona repetida. Elimínala y vuelve a crearla.';
    ids.add(zone.id);
  }
  for (let i = 0; i < zones.length; i += 1) {
    for (let j = i + 1; j < zones.length; j += 1) {
      if (zonesOverlap(zones[i], zones[j]) > OVERLAP_LIMIT) return 'Separa las zonas para que no queden una encima de otra.';
    }
  }
  return '';
}


// Zona dibujada sobre la foto. Cada zona gestiona su propio arrastre y su
// propio tirador de tamaño. Es importante que el toque no dependa de
// `locationX/locationY` del contenedor: en Android/iOS esas coordenadas son
// relativas al hijo tocado, no al contenedor con el PanResponder, por eso el
// rectángulo aparecía desplazado solo en el teléfono (en web funcionaba).
function ZoneBox({ zone, selected, imageRect, label, onSelect, onMove, onResize, onDelete }) {
  const dragOrigin = useRef(null);
  const resizeOrigin = useRef(null);
  const current = useRef({ zone, onSelect, onMove, onResize, onDelete });
  useEffect(() => {
    current.current = { zone, onSelect, onMove, onResize, onDelete };
  });

  // eslint-disable-next-line react-hooks/refs
  const dragResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    // Sin reclamar en movimiento: así un toque con temblor en el botón ✕ o en
    // el tirador no es robado por la zona.
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: () => {
      const state = current.current;
      state.onSelect();
      dragOrigin.current = { x: state.zone.x, y: state.zone.y };
    },
    onPanResponderMove: (_event, gesture) => {
      const origin = dragOrigin.current;
      if (!origin || imageRect.width === 0 || imageRect.height === 0) return;
      current.current.onMove(
        origin.x + gesture.dx / imageRect.width,
        origin.y + gesture.dy / imageRect.height,
      );
    },
    onPanResponderRelease: () => { dragOrigin.current = null; },
    onPanResponderTerminate: () => { dragOrigin.current = null; },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [imageRect.width, imageRect.height]);

  // eslint-disable-next-line react-hooks/refs
  const resizeResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: () => {
      const state = current.current;
      state.onSelect();
      resizeOrigin.current = { w: state.zone.w, h: state.zone.h };
    },
    onPanResponderMove: (_event, gesture) => {
      const origin = resizeOrigin.current;
      if (!origin || imageRect.width === 0 || imageRect.height === 0) return;
      current.current.onResize(
        origin.w + gesture.dx / imageRect.width,
        origin.h + gesture.dy / imageRect.height,
      );
    },
    onPanResponderRelease: () => { resizeOrigin.current = null; },
    onPanResponderTerminate: () => { resizeOrigin.current = null; },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [imageRect.width, imageRect.height]);

  return (
    <View
      style={[styles.zone, {
        left: imageRect.x + zone.x * imageRect.width,
        top: imageRect.y + zone.y * imageRect.height,
        width: Math.max(24, zone.w * imageRect.width),
        height: Math.max(24, zone.h * imageRect.height),
        borderColor: selected ? C.navy : C.muted,
        backgroundColor: selected ? 'rgba(36,116,67,0.18)' : 'rgba(0,0,0,0.08)',
      }]}
      {...dragResponder.panHandlers}
    >
      <Text style={styles.zoneLabel} numberOfLines={1}>{label}</Text>
      {selected ? (
        <>
          <View style={styles.resizeHandle} {...resizeResponder.panHandlers} />
          <TouchableOpacity
            style={styles.delete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => onDelete(zone.id)}
          >
            <Text style={styles.deleteText}>✕</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

function friendlyCameraError(failure, fallback) {
  const status = Number(failure?.status ?? 0);
  if (status === 409) return 'La información cambió mientras editabas. Vuelve a cargar la pantalla e inténtalo de nuevo.';
  if (status === 401 || status === 403) return 'No tienes permiso para hacer este cambio. Vuelve a iniciar sesión o consulta con un administrador.';
  if (status === 404) return 'No encontramos la cámara o el estante. Vuelve a la lista de dispositivos y abre esta pantalla de nuevo.';
  if (status === 408 || status === 502 || status === 503 || status === 504) return 'No pudimos comunicarnos con la cámara. Verifica que esté encendida e inténtalo de nuevo.';
  if (status === 0) return 'No pudimos comunicarnos con el sistema. Revisa tu conexión e inténtalo de nuevo.';
  return fallback;
}

export default function ShelfZonesScreen({ go }) {
  const d = useDevices();
  const shelvesState = useData('listShelves');
  const { accessToken } = useAuth();
  const device = d.device;
  const branchId = d.branchId;
  const deviceId = device?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shelf, setShelf] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [products, setProducts] = useState([]);
  const [zones, setZones] = useState([]);
  const [baseVersion, setBaseVersion] = useState(0);
  const [selected, setSelected] = useState(null);
  const [productPicker, setProductPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [saved, setSaved] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingShelf, setEditingShelf] = useState(false);
  const [shelfNameDraft, setShelfNameDraft] = useState('');
  const [shelfLocationDraft, setShelfLocationDraft] = useState('');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState(null);

  const draftRef = useRef(null);   // { startX, startY, id } mientras se dibuja



  const load = useCallback(async () => {
    if (!branchId || !deviceId) return;
    setLoading(true);
    setError('');
    try {
      const shelfValue = await deviceAdapter.getDeviceShelf({ branchId, deviceId, accessToken });
      if (!shelfValue) {
        setShelf(null);
        setLoading(false);
        return;
      }
      setShelf(shelfValue);
      setShelfNameDraft(shelfValue?.name || '');
      setShelfLocationDraft(shelfValue?.location || '');
      const [roiData, productList, photo] = await Promise.all([
        deviceAdapter.listRois({ branchId, shelfId: shelfValue.id, accessToken }),
        deviceAdapter.listProducts({ branchId, accessToken }),
        deviceAdapter.fetchSnapshot({ branchId, deviceId, accessToken }).catch(() => null),
      ]);
      setProducts(productList || []);
      setZones((roiData?.rois || []).map((roi) => ({
        id: roi.id,
        fromDb: true,
        productId: roi.productId ?? roi.product_id ?? null,
        name: roi.name || '',
        x: Number(roi.x ?? roi.bboxX ?? 0),
        y: Number(roi.y ?? roi.bboxY ?? 0),
        w: Number(roi.w ?? roi.bboxW ?? 0.2),
        h: Number(roi.h ?? roi.bboxH ?? 0.2),
      })));
      setBaseVersion(roiData?.version ?? 0);
      setSnapshot(photo);
      if (photo?.uri) {
        Image.getSize(photo.uri, (w, h) => {
          if (w > 0 && h > 0) setImageSize({ width: w, height: h });
        }, () => setImageSize(null));
      } else {
        setImageSize(null);
      }
    } catch (failure) {
      setError(friendlyCameraError(failure, 'No pudimos cargar la configuración. Inténtalo de nuevo.'));
    } finally {
      setLoading(false);
    }
  }, [branchId, deviceId, accessToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function linkShelf(shelfId) {
    setError('');
    try {
      const updated = await deviceAdapter.linkShelf({ branchId, deviceId, shelfId, accessToken });
      if (updated?.id) { setShelf(updated); await load(); }
    } catch (failure) {
      setError(friendlyCameraError(failure, 'No pudimos vincular la repisa. Revisa que tenga sus productos configurados.'));
    }
  }

  function updateZone(id, patch) {
    setZones((previous) => previous.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)));
  }

  // Desplazar una zona usando deltas del gesto (no coordenadas absolutas).
  function moveZone(id, x, y) {
    setZones((previous) => previous.map((zone) => (
      zone.id === id
        ? { ...zone, x: clamp(x, 0, 1 - zone.w), y: clamp(y, 0, 1 - zone.h) }
        : zone
    )));
  }

  // Redimensionar una zona usando deltas del gesto.
  function resizeZone(id, w, h) {
    setZones((previous) => previous.map((zone) => (
      zone.id === id
        ? { ...zone, w: clamp(w, MIN_SIDE, 1 - zone.x), h: clamp(h, MIN_SIDE, 1 - zone.y) }
        : zone
    )));
  }

  const imageRect = useMemo(() => {
    const iw = imageSize?.width || size.width || 1;
    const ih = imageSize?.height || size.height || 1;
    const scale = Math.min(size.width / iw, size.height / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    return { x: (size.width - dw) / 2, y: (size.height - dh) / 2, width: dw, height: dh };
  }, [size, imageSize]);

  // Capa de fondo: solo crea zonas nuevas. Las zonas existentes viven en una
  // capa superior y gestionan su propio toque, así que aquí el evento siempre
  // apunta a esta capa y `locationX/locationY` es la posición correcta.
  const startPan = useCallback((event) => {
    if (imageRect.width === 0 || imageRect.height === 0 || saving || applying) return false;
    const { locationX, locationY } = event.nativeEvent;
    const x = clamp((locationX - imageRect.x) / imageRect.width, 0, 1);
    const y = clamp((locationY - imageRect.y) / imageRect.height, 0, 1);
    const zone = { id: newId(), x, y, w: 0, h: 0, productId: null, name: '' };
    draftRef.current = { startX: x, startY: y, id: zone.id };
    setZones((previous) => [...previous, zone]);
    setSelected(zone.id);
  }, [imageRect, saving, applying]);

  const movePan = useCallback((event) => {
    const draft = draftRef.current;
    if (!draft || imageRect.width === 0 || imageRect.height === 0) return;
    const { locationX, locationY } = event.nativeEvent;
    const x = clamp((locationX - imageRect.x) / imageRect.width, 0, 1);
    const y = clamp((locationY - imageRect.y) / imageRect.height, 0, 1);
    setZones((previous) => previous.map((zone) => {
      if (zone.id !== draft.id) return zone;
      return {
        ...zone,
        x: Math.min(draft.startX, x),
        y: Math.min(draft.startY, y),
        w: Math.max(MIN_SIDE, Math.abs(x - draft.startX)),
        h: Math.max(MIN_SIDE, Math.abs(y - draft.startY)),
      };
    }));
  }, [imageRect]);

  const endPan = useCallback(() => {
    const draft = draftRef.current;
    draftRef.current = null;
    if (!draft) return;
    // Un toque sin arrastre crea una zona de tamaño inicial utilizable.
    setZones((previous) => previous.map((zone) => {
      if (zone.id !== draft.id || (zone.w >= DEFAULT_SIDE && zone.h >= DEFAULT_SIDE)) return zone;
      const w = Math.max(MIN_SIDE, DEFAULT_SIDE);
      const h = Math.max(MIN_SIDE, DEFAULT_SIDE);
      return { ...zone, x: clamp(zone.x, 0, 1 - w), y: clamp(zone.y, 0, 1 - h), w, h };
    }));
  }, []);

  // eslint-disable-next-line react-hooks/refs
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => startPan(e),
    onPanResponderMove: (e) => movePan(e),
    onPanResponderRelease: () => endPan(),
    onPanResponderTerminate: () => endPan(),
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [startPan, movePan, endPan]);

  function deleteZone(id) {
    setZones((previous) => previous.filter((zone) => zone.id !== id));
    if (selected === id) setSelected(null);
  }

  const validationError = validateZones(zones);

  async function doSaveAndApply() {
    setSaving(true);
    setError('');
    setSaved('');
    try {
      const payload = zones.map((zone, index) => ({
        id: zone.fromDb ? zone.id : null,
        product_id: zone.productId,
        name: zone.name || `Zona ${index + 1}`,
        x: zone.x,
        y: zone.y,
        w: zone.w,
        h: zone.h,
        visual_capacity_units: null,
      }));
      const result = await d.mutate('saveRois', {
        branchId, shelfId: shelf.id, baseVersion, rois: payload,
      });
      const version = result?.version ?? baseVersion + 1;
      if (Array.isArray(result?.rois) && result.rois.length === zones.length) {
        setZones(result.rois.map((roi) => ({
          id: roi.id,
          fromDb: true,
          productId: roi.product_id ?? roi.productId ?? null,
          name: roi.name || '',
          x: Number(roi.x),
          y: Number(roi.y),
          w: Number(roi.w),
          h: Number(roi.h),
        })));
      }
      setBaseVersion(version);
      setApplying(true);
      setSaving(false);
      const applied = await d.mutate('applyRois', { branchId, shelfId: shelf.id, version });
      if (!applied?.confirmed && applied?.ok !== true) throw new Error('camera_not_confirmed');
      setSaved('Cambios guardados.');
    } catch (failure) {
      setError(friendlyCameraError(failure, 'No pudimos guardar los cambios. Verifica que la cámara esté encendida e inténtalo de nuevo.'));
    } finally {
      setSaving(false);
      setApplying(false);
    }
  }

  async function saveAndApply() {
    if (!shelf || validationError || saving || applying) return;
    if (zones.length === 0) {
      setConfirmDelete(true);
      return;
    }
    await doSaveAndApply();
  }

  function confirmDeleteZones() {
    setConfirmDelete(false);
    doSaveAndApply();
  }

  async function saveShelfDetails() {
    if (!shelf?.id || !shelfNameDraft.trim()) return;
    try {
      const updated = await deviceAdapter.updateShelf({
        branchId, shelfId: shelf.id, name: shelfNameDraft.trim(),
        location: shelfLocationDraft.trim() || null, accessToken,
      });
      setShelf(updated || { ...shelf, name: shelfNameDraft.trim(), location: shelfLocationDraft.trim() || null });
      setEditingShelf(false);
    } catch (failure) {
      setError(friendlyCameraError(failure, 'No pudimos guardar los datos de la repisa.'));
    }
  }

  if (!deviceId || !branchId) return <Shell go={go} title="Configurar zonas" back="camera-detail">
    <Info title="Selecciona una cámara">Vuelve a tus dispositivos y elige la cámara que quieres configurar.</Info>
  </Shell>;

  if (loading) return <Shell go={go} title="Configurar zonas" back="camera-detail">
    <View style={styles.center}><ActivityIndicator color={C.navy} /><Text style={styles.muted}>Cargando zonas…</Text></View>
  </Shell>;

  if (!shelf) return <Shell go={go} title="Configurar zonas" back="camera-detail">
    <Info title="Esta cámara no tiene repisa asignada">
      Crea la repisa en Estantes, asígnale productos y configura su orientación y medidas en Productos. Después vuelve aquí y selecciónala.
    </Info>
    <Primary variant="light" onPress={() => go('shelves')}>Ir a Estantes</Primary>
    <SectionLabel>Repisas disponibles para vincular</SectionLabel>
    <LoadState state={shelvesState}>
      {(shelvesState.data || []).map(item => <NavRow key={item.id} label={item.name}
        detail={item.location || 'Sin ubicación'} onPress={() => linkShelf(item.id)} />)}
      {!(shelvesState.data || []).length ? <Info>No hay repisas todavía. Créala primero en Estantes.</Info> : null}
    </LoadState>
    <ErrorNotice message={error} />
  </Shell>;

  if (!snapshot) return <Shell go={go} title="Configurar zonas" back="camera-detail">
    <Info title="Toma una foto para empezar">Usaremos la foto como guía para marcar las áreas que quieres monitorear.</Info>
    <Primary onPress={async () => {
      setError('');
      try {
        await deviceAdapter.requestSnapshot({ branchId, deviceId, accessToken });
        await load();
      } catch (failure) {
        setError(friendlyCameraError(failure, 'No pudimos tomar la foto. Verifica que la cámara esté encendida e inténtalo de nuevo.'));
      }
    }}>Tomar foto</Primary>
    <ErrorNotice message={error} />
  </Shell>;

  const selectedZone = zones.find((zone) => zone.id === selected) || null;
  const productsById = new Map((products || []).map(product => [product.id, product]));
  const missingPhysical = zones.filter(zone => zone.productId && !productsById.get(zone.productId)?.physicalConfigured);

  return <Shell go={go} title="Configurar zonas" subtitle={shelf?.name ? `Repisa: ${shelf.name}` : undefined} back="camera-detail" busy={saving || applying}>
    {missingPhysical.length > 0 ? <Info title="Configura los productos antes de calibrar">
      Hay zonas con productos sin orientación ni medidas físicas. Ajusta esos datos en Productos para que la calibración use referencias reales.
      <Primary variant="light" onPress={() => go('products')}>Ir a Productos</Primary>
    </Info> : null}
    {shelf ? <TouchableOpacity style={styles.editShelfButton} onPress={() => { setShelfNameDraft(shelf.name || ''); setShelfLocationDraft(shelf.location || ''); setEditingShelf(true); }}>
      <Text style={styles.editShelfText}>Editar nombre y ubicación de la repisa</Text>
    </TouchableOpacity> : null}
    <ErrorNotice message={error} />
    {saved ? <Info title="Listo">{saved}</Info> : null}
    {saved ? <NavRow
      label="Continuar con la calibración"
      detail="Captura la zona vacía y abastecida"
      onPress={() => { d.selectDevice(device); go('calibration'); }}
    /> : null}
    <View style={styles.preview} onLayout={(event) => {
      const { width, height } = event.nativeEvent.layout;
      if (width !== size.width || height !== size.height) setSize({ width, height });
    }}>
      <Image
        source={{ uri: snapshot.uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        onLoad={(event) => {
          // El propio Image reporta el tamaño real decodificado: es más fiable
          // en móvil que Image.getSize con data URI.
          const source = event?.nativeEvent?.source;
          if (source?.width > 0 && source?.height > 0) {
            setImageSize((previous) => (
              previous?.width === source.width && previous?.height === source.height
                ? previous
                : { width: source.width, height: source.height }
            ));
          }
        }}
      />
      {/* Fondo: crear zonas nuevas. Es una capa sin hijos, así que el toque
          siempre se mide contra ella y no contra una zona concreta. */}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
      {/* Zonas encima, cada una con su propio toque, arrastre y tirador. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {zones.map((zone) => (
          <ZoneBox
            key={zone.id}
            zone={zone}
            selected={selected === zone.id}
            imageRect={imageRect}
            label={zone.productId
              ? (products.find((p) => p.id === zone.productId)?.name || 'Producto')
              : 'Sin producto'}
            onSelect={() => setSelected(zone.id)}
            onMove={(x, y) => moveZone(zone.id, x, y)}
            onResize={(w, h) => resizeZone(zone.id, w, h)}
            onDelete={deleteZone}
          />
        ))}
      </View>
    </View>
    <Text style={styles.hint}>
      Toca y arrastra sobre la foto para crear una zona. Después selecciónala, asigna un producto y ajusta su tamaño. Máximo {MAX_ZONES} zonas.
    </Text>

    {selectedZone && (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Zona seleccionada</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Producto</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setProductPicker(true)}>
            <Text style={styles.pickerText}>
              {selectedZone.productId ? (products.find((p) => p.id === selectedZone.productId)?.name || 'Producto') : 'Elegir producto'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.danger} onPress={() => deleteZone(selectedZone.id)}>
          <Text style={styles.dangerText}>Borrar zona</Text>
        </TouchableOpacity>
        {selectedZone.fromDb ? <TouchableOpacity
          style={styles.calibrate}
          onPress={() => {
            d.setZone({ id: selectedZone.id, name: selectedZone.name, productId: selectedZone.productId });
            go('calibration');
          }}
        >
          <Text style={styles.calibrateText}>Preparar calibración de esta zona</Text>
          <Text style={styles.calibrateDetail}>Usa la última versión guardada y aplicada en la cámara.</Text>
        </TouchableOpacity> : null}
      </View>
    )}

    <Primary onPress={saveAndApply} loading={saving || applying} loadingLabel="Guardando…" disabled={!!validationError}>
      {zones.length === 0 ? 'Borrar todas las zonas' : 'Guardar cambios'}
    </Primary>
    {validationError ? <ErrorNotice message={validationError} /> : null}

    {productPicker && (
      <View style={styles.modal}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Elegir producto</Text>
          <ScrollView style={{ maxHeight: 260 }}>
            {products.length === 0 && (
              <View style={{ gap: 8, paddingVertical: 8 }}>
                <Text style={styles.muted}>No hay productos. Créelos desde “Productos” en el panel.</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => go('products')}>
                  <Text style={styles.pickerText}>Ir a Productos</Text>
                </TouchableOpacity>
              </View>
            )}
            {products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productRow}
                onPress={() => {
                  if (selected) updateZone(selected, { productId: product.id, name: product.name });
                  setProductPicker(false);
                }}
              >
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productSku}>SKU · {product.sku}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalClose} onPress={() => setProductPicker(false)}>
            <Text style={styles.modalCloseText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
    {confirmDelete && (
      <View style={styles.modal}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Borrar todas las zonas</Text>
          <Text style={styles.muted}>Se eliminarán todas las zonas de esta repisa en la cámara. ¿Continuar?</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setConfirmDelete(false)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalClose, { backgroundColor: C.danger, borderRadius: 10 }]} onPress={confirmDeleteZones}>
              <Text style={[styles.modalCloseText, { color: '#fff' }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )}
    {editingShelf && (
      <View style={styles.modal}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Editar repisa</Text>
          <TextInput style={styles.input} value={shelfNameDraft} onChangeText={setShelfNameDraft} placeholder="Nombre de la repisa" />
          <TextInput style={styles.input} value={shelfLocationDraft} onChangeText={setShelfLocationDraft} placeholder="Ubicación (opcional)" />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setEditingShelf(false)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalClose, { backgroundColor: C.navy, borderRadius: 10 }]} onPress={saveShelfDetails}>
              <Text style={[styles.modalCloseText, { color: '#fff' }]}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )}
  </Shell>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 10, padding: 20 },
  muted: { color: C.muted, fontSize: 14, lineHeight: 21 },
  preview: { backgroundColor: C.border, borderRadius: 16, overflow: 'hidden', aspectRatio: 4 / 3, position: 'relative' },
  zone: { position: 'absolute', borderWidth: 2, borderRadius: 6, padding: 4, justifyContent: 'flex-start' },
  zoneLabel: { color: C.ink, fontSize: 11, fontWeight: '600' },
  resizeHandle: { position: 'absolute', bottom: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: C.navy, borderWidth: 2, borderColor: '#fff' },
  delete: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  hint: { color: C.muted, fontSize: 13, lineHeight: 19 },
  panel: { backgroundColor: C.field, borderRadius: 16, padding: 14, gap: 10 },
  panelTitle: { color: C.ink, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: C.muted, fontSize: 13, width: 80 },
  pickerButton: { flex: 1, backgroundColor: C.border, borderRadius: 10, padding: 10 },
  pickerText: { color: C.ink, fontSize: 14 },
  danger: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: C.danger },
  dangerText: { color: C.danger, fontSize: 13, fontWeight: '600' },
  calibrate: { backgroundColor: C.navy, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  calibrateText: { color: C.white, fontSize: 14, fontWeight: '600' },
  calibrateDetail: { color: C.subtitleOnDark, fontSize: 12 },
  modal: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: C.field, borderRadius: 20, padding: 16, gap: 12 },
  modalTitle: { color: C.ink, fontSize: 18, fontWeight: '700' },
  productRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  productName: { color: C.ink, fontSize: 14, fontWeight: '600' },
  productSku: { color: C.muted, fontSize: 12 },
  modalClose: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12 },
  modalCloseText: { color: C.navy, fontSize: 14, fontWeight: '600' },
  editShelfButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.border },
  editShelfText: { color: C.navy, fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, color: C.ink, fontSize: 14 },
});