import test from 'node:test';
import assert from 'node:assert/strict';
import { editorDocument, elementBounds, moveMapElement, newMapElementId, rectangleForMap } from '../src/utils/mapEditor.js';

const area = { schema_version: 1, width: 100, height: 80, elements: [] };
const fields = { width: '100', height: '80' };
const first = () => rectangleForMap(area, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

test('rectángulo centrado, tamaño relativo e identidad UUID sin modificar el área', () => {
  assert.deepEqual(first(), { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', kind: 'rectangle',
    label: 'Rectángulo 1', x: 40, y: 32, width: 20, height: 16, rotation: 0 });
  assert.equal(area.elements.length, 0);
  assert.match(newMapElementId(), /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
  assert.deepEqual(rectangleForMap({ width: 1, height: 1, elements: [] }, 'tiny'),
    { id: 'tiny', kind: 'rectangle', label: 'Rectángulo 1', x: 0, y: 0, width: 1, height: 1, rotation: 0 });
  assert.throws(() => rectangleForMap({ ...area, elements: Array(200).fill(first()) }), /200/);
});

test('campos editables normalizan números y nombre, sin mutar el original', () => {
  const original = { ...first(), label: '  Entrada  ', width: '20,5', x: '10', rotation: '45' };
  const result = editorDocument(area, fields, [original]);
  assert.equal(result.elements[0].width, 20.5);
  assert.equal(result.elements[0].label, 'Entrada');
  assert.equal(result.elements[0].id, original.id);
  assert.equal(original.width, '20,5');
  assert.equal(original.label, '  Entrada  ');
});

test('rechaza geometría inválida y reducción del área sin recortar ni recolocar silenciosamente', () => {
  for (const patch of [{ x: -1 }, { width: '' }, { height: 0 }, { rotation: 360 },
    { rotation: 'NaN' }, { width: Infinity }, { x: 99 }, { label: 'x'.repeat(81) }]) {
    assert.throws(() => editorDocument(area, fields, [{ ...first(), ...patch }]));
  }
  assert.throws(() => editorDocument(area, { width: '30', height: '30' }, [first()]), /fuera del área/);
  assert.throws(() => editorDocument(area, fields, [{ ...first(), x: 0, y: 0, rotation: 45 }]), /giro/);
});

test('arrastre se mantiene dentro del área incluso con giro y coincide con la validación de guardado', () => {
  for (const rotation of [0, 45, 90, 180, 270, 359]) {
    const element = { ...first(), rotation };
    for (const [x, y] of [[-100, -100], [1000, 1000], [20, 30]]) {
      const moved = moveMapElement(area, element, x, y);
      const bounds = elementBounds(moved);
      assert.ok(bounds.left >= -1e-7 && bounds.top >= -1e-7);
      assert.ok(bounds.right <= area.width + 1e-7 && bounds.bottom <= area.height + 1e-7);
      assert.doesNotThrow(() => editorDocument(area, fields, [moved]));
      assert.equal(moved.id, element.id);
      assert.equal(moved.rotation, rotation);
    }
  }
});
