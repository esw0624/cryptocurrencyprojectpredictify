import assert from 'node:assert/strict';
import test from 'node:test';

import { __internalApiClientHelpers } from '../apps/web/src/lib/apiClient.ts';

test('ensureAllRequestedSymbols keeps requested order', () => {
  const rows = [
    { symbol: 'ETH' as const, value: 2 },
    { symbol: 'BTC' as const, value: 1 },
    { symbol: 'XRP' as const, value: 3 }
  ];

  const ordered = __internalApiClientHelpers.ensureAllRequestedSymbols('provider', ['BTC', 'ETH', 'XRP'], rows);

  assert.deepEqual(ordered.map((row) => row.symbol), ['BTC', 'ETH', 'XRP']);
});

test('ensureAllRequestedSymbols throws when provider omits a requested symbol', () => {
  const rows = [
    { symbol: 'BTC' as const, value: 1 },
    { symbol: 'XRP' as const, value: 3 }
  ];

  assert.throws(
    () => __internalApiClientHelpers.ensureAllRequestedSymbols('provider', ['BTC', 'ETH', 'XRP'], rows),
    /missing ETH/
  );
});
