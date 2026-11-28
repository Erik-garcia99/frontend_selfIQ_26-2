import { resizeDraft } from './mapDraft.js';

export const MAX_MAP_ELEMENTS = 200;

export function newMapElementId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Identidad gráfica, no un secreto ni un token de autorización.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 3) | 8).toString(16);
  });
}

export function rectangleForMap(document, id = newMapElementId()) {
  if (document.elements.length >= MAX_MAP_ELEMENTS) throw new Error('Puedes colocar hasta 200 figuras.');
  const width = Math.max(1, document.width / 5);
  const height = Math.max(1, document.height / 5);
  return { id, kind: 'rectangle', label: `Rectángulo ${document.elements.length + 1}`,
    x: (document.width - width) / 2, y: (document.height - height) / 2,
    width, height, rotation: 0 };
}

export function elementBounds(element) {
  const angle = element.rotation * Math.PI / 180;
  const halfWidth = (Math.abs(Math.cos(angle)) * element.width + Math.abs(Math.sin(angle)) * element.height) / 2;
  const halfHeight = (Math.abs(Math.sin(angle)) * element.width + Math.abs(Math.cos(angle)) * element.height) / 2;
  const cx = element.x + element.width / 2, cy = element.y + element.height / 2;
  return { left: cx - halfWidth, right: cx + halfWidth,
    top: cy - halfHeight, bottom: cy + halfHeight, halfWidth, halfHeight };
}

function number(value, label, min, max, exclusive = false) {
  const text = String(value).trim().replace(',', '.');
  if (typeof value !== 'number' && !/^\d+(\.\d+)?$/.test(text))
    throw new Error(`Revisa ${label}: escribe un número válido.`);
  const parsed = typeof value === 'number' ? value : Number(text);
  if (!Number.isFinite(parsed) || parsed < min || (exclusive ? parsed >= max : parsed > max))
    throw new Error(`Revisa ${label}: debe ser ${exclusive ? 'mayor o igual a 0 y menor que 360' : `entre ${min} y ${max}`}.`);
  return parsed;
}

export function editorDocument(document, fields, elements) {
  const area = resizeDraft(document, fields);
  if (elements.length > MAX_MAP_ELEMENTS) throw new Error('Puedes colocar hasta 200 figuras.');
  const normalized = elements.map(element => ({
    ...element, label: String(element.label || '').trim(),
    x: number(element.x, 'la posición horizontal', 0, 10000),
    y: number(element.y, 'la posición vertical', 0, 10000),
    width: number(element.width, 'el ancho de la figura', 1, 10000),
    height: number(element.height, 'el largo de la figura', 1, 10000),
    rotation: number(element.rotation ?? 0, 'el giro', 0, 360, true),
  }));
  for (const element of normalized) {
    if (element.label.length > 80) throw new Error('El nombre de cada figura admite hasta 80 caracteres.');
    const bounds = elementBounds(element);
    if (bounds.left < -1e-7 || bounds.top < -1e-7 || bounds.right > area.width + 1e-7 || bounds.bottom > area.height + 1e-7)
      throw new Error(`La figura "${element.label || 'Sin nombre'}" queda fuera del área. Revisa su posición, tamaño o giro, o amplía el área.`);
  }
  return { ...area, elements: normalized };
}

export function moveMapElement(document, element, x, y) {
  const { halfWidth, halfHeight } = elementBounds(element);
  const minX = Math.max(0, halfWidth - element.width / 2);
  const minY = Math.max(0, halfHeight - element.height / 2);
  const maxX = Math.min(document.width - element.width, document.width - halfWidth - element.width / 2);
  const maxY = Math.min(document.height - element.height, document.height - halfHeight - element.height / 2);
  return { ...element, x: Math.max(minX, Math.min(maxX, x)) || 0,
    y: Math.max(minY, Math.min(maxY, y)) || 0 };
}
