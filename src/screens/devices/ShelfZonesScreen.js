import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Shell, ErrorNotice, Primary, Info, useDevices } from './DeviceUI';
import { useAuth } from '../../context/AuthContext';
import { deviceAdapter } from '../../services/deviceAdapter';
import { colors as C } from '../../theme/colors';

const MAX_ZONES = 8;
const MIN_SIDE = 0.03;
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
    if (zone.w < MIN_SIDE || zone.h < MIN_SIDE) return 'Una zona es demasiado pequeña (mínimo 3 %).';
    if (zone.x < 0 || zone.y < 0 || zone.x + zone.w > 1 || zone.y + zone.h > 1) return 'Una zona se sale de la imagen.';
    if (ids.has(zone.id)) return 'Hay zonas repetidas.';
    ids.add(zone.id);
  }
  for (let i = 0; i < zones.length; i += 1) {
    for (let j = i + 1; j < zones.length; j += 1) {
      if (zonesOverlap(zones[i], zones[j]) > OVERLAP_LIMIT) return 'Dos zonas se solapan.';
    }
  }
  return '';
}

export default function ShelfZonesScreen({ go }) {
  const d = useDevices();
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
  const [size, setSize] = useState({ width: 0, height: 0 });

  const draftRef = useRef(null);   // { startX, startY, id } mientras se dibuja
  const dragRef = useRef(null);    // { zoneId, startX, startY, origX, origY } mientras se mueve
  const resizeRef = useRef(null);  // { zoneId, startX, startY, origW, origH } mientras se redimensiona

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
    } catch (failure) {
      setError(failure?.message || 'No pudimos cargar las zonas.');
    } finally {
      setLoading(false);
    }
  }, [branchId, deviceId, accessToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function updateZone(id, patch) {
    setZones((previous) => previous.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)));
  }

  const startPan = useCallback((event) => {
    if (size.width === 0 || size.height === 0 || saving || applying) return false;
    const { locationX, locationY } = event.nativeEvent;
    const x = clamp(locationX / size.width, 0, 1);
    const y = clamp(locationY / size.height, 0, 1);
    // ¿Tocó una zona existente? → moverla.
    const hit = [...zones].reverse().find((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
    if (hit) {
      setSelected(hit.id);
      dragRef.current = { zoneId: hit.id, startX: x, startY: y, origX: hit.x, origY: hit.y };
      return;
    }
    // Si no, dibujar una nueva.
    const zone = { id: newId(), x, y, w: 0, h: 0, productId: null, name: '' };
    draftRef.current = { startX: x, startY: y, id: zone.id };
    setZones((previous) => [...previous, zone]);
    setSelected(zone.id);
  }, [size, saving, applying, zones]);

  const movePan = useCallback((event) => {
    if (size.width === 0 || size.height === 0) return;
    const { locationX, locationY } = event.nativeEvent;
    const x = clamp(locationX / size.width, 0, 1);
    const y = clamp(locationY / size.height, 0, 1);
    if (dragRef.current) {
      const d = dragRef.current;
      const zone = zones.find((z) => z.id === d.zoneId);
      if (!zone) return;
      const nx = clamp(d.origX + (x - d.startX), 0, 1 - zone.w);
      const ny = clamp(d.origY + (y - d.startY), 0, 1 - zone.h);
      updateZone(d.zoneId, { x: nx, y: ny });
      return;
    }
    if (draftRef.current) {
      const d = draftRef.current;
      const zone = zones.find((z) => z.id === d.id);
      if (!zone) return;
      const next = {
        x: Math.min(d.startX, x),
        y: Math.min(d.startY, y),
        w: Math.max(MIN_SIDE, Math.abs(x - d.startX)),
        h: Math.max(MIN_SIDE, Math.abs(y - d.startY)),
      };
      updateZone(d.id, next);
    }
  }, [size, zones]);

  const endPan = useCallback(() => {
    draftRef.current = null;
    dragRef.current = null;
  }, []);

  // eslint-disable-next-line react-hooks/refs
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => startPan(e),
    onPanResponderMove: (e) => movePan(e),
    onPanResponderRelease: () => endPan(),
    onPanResponderTerminate: () => endPan(),
  }), [startPan, movePan, endPan]);

  function deleteZone(id) {
    setZones((previous) => previous.filter((zone) => zone.id !== id));
    if (selected === id) setSelected(null);
  }

  function startResize(event, zone) {
    event.stopPropagation?.();
    const { locationX, locationY } = event.nativeEvent;
    // coordenadas relativas al contenedor (el handle está dentro de la zona)
    resizeRef.current = { zoneId: zone.id, startX: (zone.x * size.width + locationX) / size.width, startY: (zone.y * size.height + locationY) / size.height, origW: zone.w, origH: zone.h };
  }

  // eslint-disable-next-line react-hooks/refs
  const resizeResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      const z = zones.find((zz) => zz.id === selected);
      if (z) resizeRef.current = { zoneId: z.id, origW: z.w, origH: z.h };
    },
    onPanResponderMove: (e, g) => {
      const r = resizeRef.current;
      if (!r) return;
      const zone = zones.find((z) => z.id === r.zoneId);
      if (!zone) return;
      const dw = g.dx / size.width;
      const dh = g.dy / size.height;
      const w = Math.max(MIN_SIDE, Math.min(1 - zone.x, r.origW + dw));
      const h = Math.max(MIN_SIDE, Math.min(1 - zone.y, r.origH + dh));
      updateZone(r.zoneId, { w, h });
    },
    onPanResponderRelease: () => { resizeRef.current = null; },
    onPanResponderTerminate: () => { resizeRef.current = null; },
  }), [size, zones, selected]);

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
      if (!applied?.confirmed && applied?.ok !== true) throw new Error('El nodo no confirmó la aplicación.');
      setSaved('Guardado y aplicado en la cámara.');
    } catch (failure) {
      setError(failure?.message || 'No pudimos guardar o aplicar las zonas.');
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

  if (!deviceId || !branchId) return <Shell go={go} title="Zonas de la repisa" back="camera-detail">
    <Info title="Selecciona una cámara">Vuelve a tus dispositivos y elige la cámara que quieres configurar.</Info>
  </Shell>;

  if (loading) return <Shell go={go} title="Zonas de la repisa" back="camera-detail">
    <View style={styles.center}><ActivityIndicator color={C.navy} /><Text style={styles.muted}>Cargando zonas…</Text></View>
  </Shell>;

  if (!shelf) return <Shell go={go} title="Zonas de la repisa" back="camera-detail">
    <Info title="Esta cámara no tiene repisa asignada">
      Una cámara controla una repisa. Crea la repisa para esta cámara y después dibuja las zonas.
    </Info>
    <Primary onPress={async () => {
      try {
        const created = await deviceAdapter.createShelf({ branchId, deviceId, name: 'Repisa principal', accessToken });
        if (created?.id) { setShelf(created); await load(); }
      } catch (failure) { setError(failure?.message || 'No se pudo crear la repisa.'); }
    }}>Crear repisa para esta cámara</Primary>
    <ErrorNotice message={error} />
  </Shell>;

  if (!snapshot) return <Shell go={go} title="Zonas de la repisa" back="camera-detail">
    <Info title="Toma una foto para empezar">Necesitamos una foto de la repisa para dibujar las zonas.</Info>
    <Primary onPress={() => deviceAdapter.requestSnapshot({ branchId, deviceId, accessToken }).then(() => load())}>Tomar foto</Primary>
    <ErrorNotice message={error} />
  </Shell>;

  const selectedZone = zones.find((zone) => zone.id === selected) || null;

  return <Shell go={go} title="Zonas de la repisa" subtitle={`${device?.name || ''}${shelf?.name ? ' · ' + shelf.name : ''}`} back="camera-detail" busy={saving || applying}>
    <ErrorNotice message={error} />
    {saved ? <Info title="Listo">{saved}</Info> : null}
    <View style={styles.preview} onLayout={(event) => {
      const { width, height } = event.nativeEvent.layout;
      if (width !== size.width || height !== size.height) setSize({ width, height });
    }}>
      <Image source={{ uri: snapshot.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        {zones.map((zone) => (
          <View
            key={zone.id}
            style={[styles.zone, {
              left: zone.x * size.width,
              top: zone.y * size.height,
              width: Math.max(24, zone.w * size.width),
              height: Math.max(24, zone.h * size.height),
              borderColor: selected === zone.id ? C.navy : C.muted,
              backgroundColor: selected === zone.id ? 'rgba(36,116,67,0.18)' : 'rgba(0,0,0,0.08)',
            }]}
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelected(zone.id)} />
            <Text style={styles.zoneLabel} numberOfLines={1}>
              {zone.productId ? (products.find((p) => p.id === zone.productId)?.name || 'Producto') : 'Sin producto'}
            </Text>
            {selected === zone.id && (
              <>
                <TouchableOpacity style={styles.resizeHandle} {...resizeResponder.panHandlers} />
                <TouchableOpacity style={styles.delete} onPress={() => deleteZone(zone.id)}>
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ))}
      </View>
    </View>
    <Text style={styles.hint}>
      Pasos: 1) Dibuja un rectángulo tocando un espacio vacío. 2) Toca la zona y elige un producto. 3) Arrastra para mover, usa la esquina azul para redimensionar. 4) “Guardar y aplicar”. Máximo {MAX_ZONES} zonas.
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
      </View>
    )}

    <Primary onPress={saveAndApply} loading={saving || applying} loadingLabel={saving ? 'Guardando…' : 'Enviando a la cámara…'} disabled={!!validationError}>
      {zones.length === 0 ? 'Borrar todas las zonas' : 'Guardar y aplicar'}
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
  modal: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: C.field, borderRadius: 20, padding: 16, gap: 12 },
  modalTitle: { color: C.ink, fontSize: 18, fontWeight: '700' },
  productRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  productName: { color: C.ink, fontSize: 14, fontWeight: '600' },
  productSku: { color: C.muted, fontSize: 12 },
  modalClose: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12 },
  modalCloseText: { color: C.navy, fontSize: 14, fontWeight: '600' },
});