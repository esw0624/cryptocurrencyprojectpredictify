import assert from 'node:assert/strict';
import test from 'node:test';

import { engineerFeatures, normalizePriceData, type PriceSample } from '../src/dataPipeline.ts';

const fixtures: PriceSample[] = [
  { timestamp: '2025-01-01T00:00:00Z', open: 10, high: 12, low: 9, close: 11, volume: 100 },
  { timestamp: '2025-01-02T00:00:00Z', open: 11, high: 13, low: 10, close: 12, volume: 120 },
  { timestamp: '2025-01-03T00:00:00Z', open: 12, high: 13, low: 11, close: 11, volume: 80 }
];

test('normalizePriceData adds z-score and volume ratio derived from the batch', () => {
  const normalized = normalizePriceData(fixtures);

  assert.equal(normalized.length, 3);
  assert.ok((normalized[0]?.closeZScore ?? 0) < (normalized[1]?.closeZScore ?? 0));
  assert.ok((normalized[1]?.closeZScore ?? 0) > 1);
  assert.ok((normalized[2]?.closeZScore ?? 0) < 0);
  assert.ok(Math.abs((normalized[0]?.volumeRatio ?? 0) - 1) < 0.001);
  assert.ok(Math.abs((normalized[1]?.volumeRatio ?? 0) - 1.2) < 0.001);
});

test('normalizePriceData returns an empty array for empty input', () => {
  assert.deepEqual(normalizePriceData([]), []);
});

test('engineerFeatures derives change and intraday range percentages', () => {
  const features = engineerFeatures(fixtures);

  assert.ok(Math.abs((features[0]?.closeChange ?? 0) - 0) < 0.001);
  assert.ok(Math.abs((features[1]?.closeChange ?? 0) - (12 - 11) / 11) < 0.001);
  assert.ok(Math.abs((features[2]?.rangePct ?? 0) - (13 - 11) / 12) < 0.001);
});
