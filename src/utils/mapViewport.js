// Cámara del visor en píxeles de pantalla. Nunca modifica la geometría guardada.
export const MAX_MAP_ZOOM = 8;
export const MAP_PADDING = 16;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function mapTransform(document, viewport, camera = { zoom: 1, x: 0, y: 0 }) {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const fit = Math.min(Math.max(1, width - MAP_PADDING * 2) / document.width,
    Math.max(1, height - MAP_PADDING * 2) / document.height);
  const zoom = clamp(camera.zoom, 1, MAX_MAP_ZOOM);
  const scale = fit * zoom;
  const limitX = Math.max(0, (document.width * scale - width + MAP_PADDING * 2) / 2);
  const limitY = Math.max(0, (document.height * scale - height + MAP_PADDING * 2) / 2);
  const x = clamp(camera.x, -limitX, limitX) || 0;
  const y = clamp(camera.y, -limitY, limitY) || 0;
  return { scale, zoom, x, y,
    left: (width - document.width * scale) / 2 + x,
    top: (height - document.height * scale) / 2 + y };
}

export function boundCamera(document, viewport, camera) {
  const { zoom, x, y } = mapTransform(document, viewport, camera);
  return { zoom, x, y };
}

export function zoomMap(document, viewport, camera, factor,
  anchor = { x: viewport.width / 2, y: viewport.height / 2 }) {
  const before = mapTransform(document, viewport, camera);
  const zoom = clamp(before.zoom * factor, 1, MAX_MAP_ZOOM);
  const ratio = zoom / before.zoom;
  return boundCamera(document, viewport, {
    zoom,
    x: before.x * ratio + (viewport.width / 2 - anchor.x) * (ratio - 1),
    y: before.y * ratio + (viewport.height / 2 - anchor.y) * (ratio - 1),
  });
}

export function mapPoint(document, viewport, camera, point) {
  const transform = mapTransform(document, viewport, camera);
  return { x: (point.x - transform.left) / transform.scale,
    y: (point.y - transform.top) / transform.scale };
}

export function pickMapElement(document, viewport, camera, point) {
  const local = mapPoint(document, viewport, camera, point);
  const { scale } = mapTransform(document, viewport, camera);
  // 44 px de lado como mínimo; la lista permite seleccionar figuras diminutas
  // o superpuestas sin depender de precisión en el dibujo.
  for (const element of [...document.elements].reverse()) {
    const angle = -element.rotation * Math.PI / 180 || 0;
    const dx = local.x - element.x - element.width / 2;
    const dy = local.y - element.y - element.height / 2;
    const x = dx * Math.cos(angle) - dy * Math.sin(angle);
    const y = dx * Math.sin(angle) + dy * Math.cos(angle);
    if (Math.abs(x) <= Math.max(element.width / 2, 22 / scale)
        && Math.abs(y) <= Math.max(element.height / 2, 22 / scale)) return element.id;
  }
  return null;
}

export function touchFrame(touches) {
  const points = touches.slice(0, 2);
  if (!points.length) return null;
  const center = {
    x: points.reduce((sum, point) => sum + point.locationX, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.locationY, 0) / points.length,
  };
  const distance = points.length === 2
    ? Math.hypot(points[1].locationX - points[0].locationX, points[1].locationY - points[0].locationY)
    : 0;
  return { count: points.length, center, distance };
}

export const mapKindLabels = {
  rectangle: 'Rectángulo', ellipse: 'Círculo u óvalo', hexagon: 'Hexágono',
  wall: 'Pared', door: 'Puerta', double_door: 'Puerta doble', window: 'Ventana',
};

export const mapElementLabel = element => element.label || mapKindLabels[element.kind] || 'Figura';
