import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Text, View } from 'react-native';
import { Screen, Head, Info, FieldCard, Primary } from '../../components/layout';
import { useAuth } from '../../context/AuthContext';
import { useDevices } from '../../context/DeviceContext';
import { mapService } from '../../services/mapService';
import { areaFields, mapDraftError, resizeDraft } from '../../utils/mapDraft';
import { canEditMap } from '../../utils/validation';
import { colors as C } from '../../theme/colors';
import MapViewport from '../../components/maps/MapViewport';
import { editorDocument, MAX_MAP_ELEMENTS, moveMapElement, rectangleForMap } from '../../utils/mapEditor';

export default function MapDraftScreen({ go }) {
  const { user, accessToken } = useAuth();
  const { branchId, branches } = useDevices();
  const branch = branches.find(item => item.id === branchId);
  if (!canEditMap(user)) return <Screen go={go} active="panel"><Head title="Mapa del local" /><Info>No tienes permiso para editar el mapa.</Info></Screen>;
  if (!branchId) return <Screen go={go} active="panel"><Head title="Mapa del local" back="Panel" onBack={() => go('panel')} /><Info>Selecciona una sucursal en el Panel para preparar su mapa.</Info></Screen>;
  return <DraftWorkspace key={`${user.id}:${branchId}`} branchId={branchId} branchName={branch?.name}
    accessToken={accessToken} go={go} />;
}

export function DraftWorkspace({ branchId, branchName, accessToken, go }) {
  const [saved, setSaved] = useState(null);
  const [fields, setFields] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [mapGestureActive, setMapGestureActive] = useState(false);
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('move');
  const [removeId, setRemoveId] = useState(null);
  const [canvasRevision, setCanvasRevision] = useState(0);
  const saving = useRef(false);
  const mounted = useRef(true);
  const preview = useMemo(() => {
    if (!fields) return { document: null, error: '' };
    try { return { document: editorDocument(saved?.document, fields, elements), error: '' }; }
    catch (failure) { return { document: null, error: failure.message }; }
  }, [saved, fields, elements]);
  const dirty = fields !== null && (!preview.document || JSON.stringify(preview.document)
    !== JSON.stringify(saved?.document || resizeDraft(null, areaFields(null))));
  const selected = elements.find(element => element.id === selectedId);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // Renovar el token no debe recargar encima de cambios sin guardar.
    if (saved !== null) return;
    let active = true;
    mapService.readDraft({ branchId, accessToken }).then(result => {
      if (!active) return;
      setSaved(result); setFields(areaFields(result.document)); setError(''); setConflict(false);
      setElements(result.document?.elements || []); setSelectedId(null); setRemoveId(null);
    }).catch(failure => { if (active) setError(mapDraftError(failure)); });
    return () => { active = false; };
  }, [branchId, accessToken, attempt, saved]);

  const leave = (next) => {
    if (saving.current) return;
    if (!dirty) return go(next);
    Alert.alert('Cambios sin guardar', 'Si sales ahora perderás los cambios del mapa.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Salir sin guardar', style: 'destructive', onPress: () => go(next) },
    ]);
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (saving.current || dirty) {
        if (!saving.current) Alert.alert('Cambios sin guardar', 'Guarda los cambios o usa Volver para salir sin guardarlos.');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [dirty]);

  function reload() {
    if (saving.current) return;
    const run = () => {
      setSaved(null); setFields(null); setError(''); setMessage(''); setConflict(false);
      setElements([]); setSelectedId(null); setRemoveId(null);
      setAttempt(value => value + 1);
    };
    if (!dirty) return run();
    Alert.alert('Recargar borrador', 'Se reemplazarán tus cambios por la última versión guardada.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Recargar', style: 'destructive', onPress: run },
    ]);
  }

  async function save() {
    if (saving.current || !saved || !fields || conflict || mapGestureActive) return;
    let document;
    try { document = editorDocument(saved.document, fields, elements); }
    catch (failure) { setError(failure.message); return; }
    saving.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const result = await mapService.saveDraft({ branchId, accessToken, baseVersion: saved.version, document });
      if (!mounted.current) return;
      setSaved(result); setFields(areaFields(result.document));
      setElements(result.document.elements);
      setMessage('Borrador guardado. Todavía no está publicado.');
    } catch (failure) {
      if (mounted.current) {
        setError(mapDraftError(failure));
        if (failure?.status === 409) setConflict(true);
      }
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function addRectangle() {
    if (saving.current || !preview.document) return;
    try {
      const element = rectangleForMap(preview.document);
      setElements(previous => previous.length < MAX_MAP_ELEMENTS ? [...previous, element] : previous);
      setSelectedId(element.id); setCanvasRevision(value => value + 1);
      setMode('move'); setMessage(''); setError(''); setRemoveId(null);
    } catch (failure) { setError(failure.message); }
  }

  function changeElement(id, patch) {
    if (saving.current) return;
    setElements(previous => previous.map(element => element.id === id ? { ...element, ...patch } : element));
    setMessage(''); setError('');
  }

  function moveElement(id, x, y) {
    if (saving.current || !preview.document) return;
    const element = preview.document.elements.find(item => item.id === id);
    if (element) changeElement(id, moveMapElement(preview.document, element, x, y));
  }

  return <Screen go={leave} active="panel" scrollEnabled={!mapGestureActive}>
    <Head title="Mapa del local" subtitle={branchName || 'Sucursal seleccionada'} back="Panel" onBack={() => leave('panel')} />
    <View style={{ gap: 16, paddingTop: 20 }}>
      <Text style={{ color: C.muted }}>Borrador privado: todavía no está publicado para el resto del personal ni los clientes.</Text>
      {error ? <Info title="No pudimos completar la acción">{error}</Info> : null}
      {message ? <Info title="Guardado">{message}</Info> : null}
      {!saved ? (error ? <Primary onPress={reload}>Reintentar</Primary> : <ActivityIndicator color={C.navy} />) : <>
        <Primary disabled={busy || !preview.document || elements.length >= MAX_MAP_ELEMENTS} onPress={addRectangle}>Agregar rectángulo</Primary>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Primary variant={mode === 'move' ? 'dark' : 'light'} disabled={busy}
            onPress={() => setMode('move')}>Mover figuras</Primary></View>
          <View style={{ flex: 1 }}><Primary variant={mode === 'pan' ? 'dark' : 'light'} disabled={busy}
            onPress={() => setMode('pan')}>Recorrer mapa</Primary></View>
        </View>
        {preview.document ? <MapViewport document={preview.document} onGestureActive={setMapGestureActive}
          selectedElementId={selectedId} onSelectElement={id => { setSelectedId(id); setRemoveId(null); }} onMoveElement={moveElement}
          mode={mode} disabled={busy} resetKey={canvasRevision} />
          : <Info title="Revisa el tamaño del área o de la figura">{preview.error}</Info>}
        {selected ? <>
          <Text style={{ color: C.navy, fontWeight: '700' }}>Ajustar figura seleccionada</Text>
          <Info>Los tamaños y posiciones son relativos. El giro va de 0 a menos de 360 grados. Los cambios se guardan al pulsar Guardar borrador.</Info>
          {[['label', 'Nombre de la figura'], ['x', 'Posición horizontal'], ['y', 'Posición vertical'],
            ['width', 'Ancho de la figura'], ['height', 'Largo de la figura'], ['rotation', 'Giro (grados)']].map(([name, label]) =>
            <FieldCard key={name} label={label} value={String(selected[name] ?? '')}
              keyboardType={name === 'label' ? 'default' : 'decimal-pad'} editable={!busy}
              onChangeText={value => changeElement(selected.id, { [name]: value })} />)}
          <Primary variant="light" disabled={busy} onPress={() => setRemoveId(selected.id)}>Quitar figura</Primary>
        </> : null}
        {removeId && elements.some(element => element.id === removeId) ? <Info title="¿Quitar esta figura del borrador?">
          <Text>Se quitará solo la figura del mapa. No se elimina ningún estante, producto o equipo.</Text>
          <Primary variant="danger" disabled={busy} onPress={() => {
            if (saving.current) return;
            setElements(previous => previous.filter(element => element.id !== removeId));
            if (selectedId === removeId) setSelectedId(null);
            setRemoveId(null); setMessage(''); setError('');
          }}>Confirmar eliminación</Primary>
          <Primary variant="light" disabled={busy} onPress={() => setRemoveId(null)}>Conservar figura</Primary>
        </Info> : null}
        <Info title="Prepara el área">Ajusta el ancho y el largo al tanteo. No necesitas medir el local: estos tamaños solo indican su proporción. La vista previa cambia al escribir; guarda para conservar los cambios.</Info>
        <FieldCard label="Ancho del área" value={fields.width} keyboardType="decimal-pad" editable={!busy}
          onChangeText={width => { setFields(previous => ({ ...previous, width })); setMessage(''); }} />
        <FieldCard label="Largo del área" value={fields.height} keyboardType="decimal-pad" editable={!busy}
          onChangeText={height => { setFields(previous => ({ ...previous, height })); setMessage(''); }} />
        <Text style={{ color: C.muted }}>Versión del borrador: {saved.version} · Figuras en edición: {elements.length}</Text>
        <Primary onPress={save} loading={busy} disabled={conflict || mapGestureActive || !preview.document || (!dirty && saved.document !== null)}>Guardar borrador</Primary>
        <Primary variant="light" disabled={busy} onPress={reload}>Recargar versión guardada</Primary>
      </>}
    </View>
  </Screen>;
}
