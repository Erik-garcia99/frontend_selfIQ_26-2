import assert from 'node:assert/strict';
import test from 'node:test';
import { validateThresholds } from '../src/utils/thresholdValidation.js';

test('rangos correctos y número con coma decimal', () => {
  assert.deepEqual(validateThresholds({ empty: '5', low: '25', medium: '60', samples: '3' }),
    { values: { empty: 5, low: 25, medium: 60, samples: 3 } });
  assert.equal(validateThresholds({ empty: '5,5', low: '25', medium: '60', samples: '1' }).values.empty, 5.5);
});

test('rechaza solapes, límites fuera de rango y muestras inválidas', () => {
  for (const draft of [
    { empty: '25', low: '5', medium: '60', samples: '3' },
    { empty: '5', low: '60', medium: '25', samples: '3' },
    { empty: '5', low: '25', medium: '100', samples: '3' },
    { empty: '5', low: '25', medium: '60', samples: '0' },
    { empty: '5', low: '25', medium: '60', samples: '1.5' },
    { empty: '', low: '25', medium: '60', samples: '3' },
  ]) assert.ok(validateThresholds(draft).error, JSON.stringify(draft));
});
