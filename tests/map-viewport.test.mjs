import test from 'node:test';
import assert from 'node:assert/strict';
import { boundCamera, mapTransform, mapPoint, zoomMap, pickMapElement, touchFrame, mapElementLabel } from '../src/utils/mapViewport.js';

const document = { width: 200, height: 100, elements: [] };
const viewport = { width: 320, height: 320 };
const fit = { zoom: 1, x: 0, y: 0 };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('área proporcional y centrada en teléfono, horizontal y tamaños extremos', () => {
  const transform = mapTransform(document, viewport);
  near(transform.scale, 1.44);
  near(transform.left, 16);
  near(transform.top, 88);
  near(200 * transform.scale / (100 * transform.scale), 2);
  for (const width of [1, 100, 10000]) for (const height of [1, 100, 10000]) {
    const result = mapTransform({ width, height }, { width: 280, height: 320 });
    assert.ok(Number.isFinite(result.scale) && result.scale > 0);
    assert.ok(result.left >= 15.99 && result.top >= 15.99);
  }
  const landscape = mapTransform(document, { width: 700, height: 320 });
  near(landscape.scale, 2.88);
});

test('zoom mantiene el punto bajo los dedos si no alcanza límites', () => {
  const square = { width: 100, height: 100, elements: [] };
  const camera = { zoom: 3, x: 0, y: 0 };
  const anchor = { x: 140, y: 130 };
  const before = mapPoint(square, viewport, camera, anchor);
  const zoomed = zoomMap(square, viewport, camera, 1.5, anchor);
  const after = mapPoint(square, viewport, zoomed, anchor);
  near(before.x, after.x);
  near(before.y, after.y);
  assert.equal(zoomed.zoom, 4.5);
});

test('desplazamiento acotado, zoom 1–8 y ajuste completo recuperable', () => {
  const large = boundCamera(document, viewport, { zoom: 100, x: 99999, y: -99999 });
  assert.equal(large.zoom, 8);
  const transform = mapTransform(document, viewport, large);
  assert.ok(transform.left <= 16.00001);
  assert.ok(transform.top + document.height * transform.scale >= viewport.height - 16);
  assert.deepEqual(boundCamera(document, viewport, { zoom: 1, x: 100, y: -200 }), fit);
  assert.deepEqual(zoomMap(document, viewport, large, 0.001), fit);
});

test('selección respeta coordenadas, giro, zoom y orden de superposición', () => {
  const first = { id: 'one', kind: 'rectangle', x: 60, y: 30, width: 20, height: 20, rotation: 45 };
  const second = { ...first, id: 'two' };
  const doc = { ...document, elements: [first, second] };
  const camera = { zoom: 4, x: 10, y: 20 };
  const transform = mapTransform(doc, viewport, camera);
  const point = { x: transform.left + 70 * transform.scale, y: transform.top + 40 * transform.scale };
  assert.equal(pickMapElement(doc, viewport, camera, point), 'two');
  assert.equal(pickMapElement(doc, viewport, camera, { x: 0, y: 0 }), null);
  const narrow = { ...doc, elements: [{ ...first, width: 2, height: 2, rotation: 0 }] };
  const location = mapTransform(narrow, viewport, fit);
  assert.equal(pickMapElement(narrow, viewport, fit, {
    x: location.left + 61 * location.scale + 15, y: location.top + 31 * location.scale,
  }), 'one', 'permite tocar una figura pequeña con un área mínima de 44 px');
});

test('toques simples, pellizco y etiquetas sin figuras ficticias', () => {
  assert.equal(touchFrame([]), null);
  assert.deepEqual(touchFrame([{ locationX: 10, locationY: 20 }]),
    { count: 1, center: { x: 10, y: 20 }, distance: 0 });
  assert.deepEqual(touchFrame([{ locationX: 10, locationY: 20 }, { locationX: 40, locationY: 60 }]),
    { count: 2, center: { x: 25, y: 40 }, distance: 50 });
  assert.equal(mapElementLabel({ kind: 'double_door', label: '' }), 'Puerta doble');
  assert.equal(mapElementLabel({ kind: 'rectangle', label: 'Repisa de entrada' }), 'Repisa de entrada');
  assert.equal(pickMapElement(document, viewport, fit, { x: 160, y: 160 }), null);
});
