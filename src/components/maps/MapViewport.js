import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import MapScene from './MapScene';
import { colors as C } from '../../theme/colors';
import { boundCamera, mapElementLabel, mapKindLabels, mapTransform, pickMapElement, touchFrame, zoomMap } from '../../utils/mapViewport';

const FIT = { zoom: 1, x: 0, y: 0 };

function MapControl({ label, children, onPress, disabled = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[styles.control, disabled && styles.disabled]}>
    <Text style={styles.controlText}>{children}</Text>
  </Pressable>;
}

export default function MapViewport(props) {
  // Cambiar proporciones reinicia solo la cámara del visor, no el borrador.
  return <MapViewportContent key={`${props.document.width}:${props.document.height}:${props.resetKey ?? 0}`} {...props} />;
}

export function MapViewportContent({ document, onGestureActive, selectedElementId,
  onSelectElement, onMoveElement, mode = 'pan', disabled = false }) {
  const [viewport, setViewport] = useState({ width: 0, height: 320 });
  const [camera, setCamera] = useState(FIT);
  const [localSelectedId, setLocalSelectedId] = useState(null);
  const selectedId = selectedElementId === undefined ? localSelectedId : selectedElementId;
  const cameraRef = useRef(FIT);
  const gesture = useRef(null);
  const context = useRef({ document, viewport, onGestureActive, selectedId,
    onSelectElement, onMoveElement, mode, disabled });
  const selected = document.elements.find(item => item.id === selectedId);
  const ready = viewport.width > 0;
  const editing = Boolean(onMoveElement);

  useEffect(() => {
    context.current = { document, viewport, onGestureActive, selectedId,
      onSelectElement, onMoveElement, mode, disabled };
  }, [document, viewport, onGestureActive, selectedId, onSelectElement, onMoveElement, mode, disabled]);
  useEffect(() => () => { onGestureActive?.(false); }, [onGestureActive]);

  // El inicializador solo registra callbacks. Las refs se leen en los eventos;
  // conservar el responder evita reiniciarlo al mover una figura cada frame.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    const update = next => {
      const { document, viewport } = context.current;
      cameraRef.current = boundCamera(document, viewport, next);
      setCamera(cameraRef.current);
    };
    const finish = () => { gesture.current = null; context.current.onGestureActive?.(false); };
    const select = id => {
      setLocalSelectedId(id);
      context.current.onSelectElement?.(id);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => context.current.viewport.width > 0,
      onMoveShouldSetPanResponder: () => context.current.viewport.width > 0,
      onPanResponderGrant: event => {
        const { document, viewport, disabled, onMoveElement, mode, selectedId, onGestureActive } = context.current;
        const frame = touchFrame(event.nativeEvent.touches);
        if (!frame) return;
        let element = null;
        if (!disabled && onMoveElement && mode === 'move' && frame.count === 1) {
          // La selección por lista permite mover una figura que está debajo.
          const selectedOnly = { ...document, elements: document.elements.filter(item => item.id === selectedId) };
          const id = pickMapElement(selectedOnly, viewport, cameraRef.current, frame.center)
            || pickMapElement(document, viewport, cameraRef.current, frame.center);
          element = document.elements.find(item => item.id === id) || null;
          select(id);
        }
        gesture.current = { frame, camera: cameraRef.current, moved: frame.count > 1,
          element, scale: mapTransform(document, viewport, cameraRef.current).scale };
        onGestureActive?.(true);
      },
      onPanResponderMove: event => {
        const { document, viewport, disabled, onMoveElement } = context.current;
        const frame = touchFrame(event.nativeEvent.touches);
        const start = gesture.current;
        if (!frame || !start) return;
        if (frame.count !== start.frame.count) {
          // Añadir/quitar un dedo pasa a recorrer la vista, no sigue moviendo
          // la figura con el centro desplazado del pellizco.
          gesture.current = { frame, camera: cameraRef.current, moved: true, element: null };
          return;
        }
        const dx = frame.center.x - start.frame.center.x;
        const dy = frame.center.y - start.frame.center.y;
        if (Math.hypot(dx, dy) > 6 || frame.count > 1) start.moved = true;
        if (start.element && frame.count === 1 && !disabled && onMoveElement) {
          if (start.moved) onMoveElement(start.element.id,
            start.element.x + dx / start.scale, start.element.y + dy / start.scale);
          return;
        }
        const next = frame.count > 1 && start.frame.distance > 0
          ? zoomMap(document, viewport, start.camera, frame.distance / start.frame.distance, start.frame.center)
          : start.camera;
        update({ ...next, x: next.x + dx, y: next.y + dy });
      },
      onPanResponderRelease: () => {
        const { document, viewport, disabled } = context.current;
        const start = gesture.current;
        if (start && !start.moved && !disabled) select(pickMapElement(document, viewport, cameraRef.current, start.frame.center));
        finish();
      },
      onPanResponderTerminate: finish,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    });
  });

  function update(next) {
    cameraRef.current = boundCamera(document, viewport, next);
    setCamera(cameraRef.current);
  }

  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.title}>{editing ? 'Editor del mapa' : 'Vista previa del mapa'}</Text>
    <Text style={styles.copy}>Vista desde arriba · sin escala real. La cuadrícula solo sirve de orientación.</Text>
    <View style={styles.viewport} onLayout={event => {
      const { width, height } = event.nativeEvent.layout;
      if (width > 0 && height > 0 && (width !== viewport.width || height !== viewport.height)) {
        setViewport({ width, height }); cameraRef.current = FIT; setCamera(FIT);
        gesture.current = null; onGestureActive?.(false);
      }
    }}>
      {ready ? <View pointerEvents="none">
        <MapScene document={document} viewport={viewport} camera={camera} selectedId={selectedId} />
      </View> : <Text style={styles.copy}>Preparando el área…</Text>}
      <View style={StyleSheet.absoluteFill} accessible={false} {...responder.panHandlers} />
    </View>
    <View style={styles.controls}>
      <MapControl label="Alejar mapa" disabled={!ready || camera.zoom <= 1}
        onPress={() => update(zoomMap(document, viewport, cameraRef.current, 1 / 1.5))}>−</MapControl>
      <MapControl label="Acercar mapa" disabled={!ready || camera.zoom >= 8}
        onPress={() => update(zoomMap(document, viewport, cameraRef.current, 1.5))}>+</MapControl>
      <MapControl label="Ajustar mapa a pantalla" disabled={!ready} onPress={() => update(FIT)}>Ajustar a pantalla</MapControl>
    </View>
    <Text accessibilityLiveRegion="polite" style={styles.copy}>Acercamiento: {Math.round(camera.zoom * 100)} %</Text>
    <View style={styles.controls}>
      {[['←', 'izquierda', -60, 0], ['↑', 'arriba', 0, -60], ['↓', 'abajo', 0, 60], ['→', 'derecha', 60, 0]].map(([icon, label, dx, dy]) =>
        <MapControl key={label} label={`Mover vista hacia ${label}`} disabled={!ready || camera.zoom <= 1}
          onPress={() => update({ ...cameraRef.current, x: cameraRef.current.x - dx, y: cameraRef.current.y - dy })}>{icon}</MapControl>)}
    </View>
    <Text style={styles.copy}>{editing && mode === 'move'
      ? 'Modo Mover figuras: arrastra una figura para colocarla. Arrastrar el fondo o pellizcar recorre el mapa.'
      : 'Pellizca para acercar y arrastra dentro del recuadro. Para recorrer la pantalla, desliza fuera del mapa. También puedes usar los botones.'}</Text>
    {!document.elements.length ? <Text style={styles.copy}>{editing
      ? 'El área está lista. Pulsa Agregar rectángulo para empezar.'
      : 'El área está lista. Aún no hay figuras: podrás agregarlas en la siguiente entrega.'}</Text> : <>
      <Text style={styles.title}>Figuras del borrador</Text>
      {document.elements.map(element => <Pressable key={element.id} accessibilityRole="button"
        accessibilityState={{ selected: element.id === selectedId }}
        disabled={disabled} onPress={() => { setLocalSelectedId(element.id); onSelectElement?.(element.id); }}
        style={[styles.item, element.id === selectedId && styles.selected]}>
        <Text style={styles.controlText}>{mapElementLabel(element)}</Text>
      </Pressable>)}
    </>}
    {selected ? <Text accessibilityLiveRegion="polite" style={styles.copy}>
      Seleccionado: {mapElementLabel(selected)} · {mapKindLabels[selected.kind]}. La asociación con estantes se agregará después.
    </Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { color: C.navy, fontSize: 17, fontWeight: '700' },
  copy: { color: C.muted, fontSize: 14, lineHeight: 21 },
  viewport: { height: 320, width: '100%', overflow: 'hidden', backgroundColor: '#edf1f5',
    borderRadius: 16, borderWidth: 1, borderColor: C.border },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  control: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 12 },
  controlText: { color: C.navy, fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  item: { minHeight: 44, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  selected: { backgroundColor: '#e0f3ef', borderColor: '#006b65' },
});
