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

test('firstSuccessful falls through providers until one succeeds', async () => {
  const calls: string[] = [];

  const result = await __internalApiClientHelpers.firstSuccessful<number>([
    async () => {
      calls.push('first');
      throw new Error('first failed');
    },
    async () => {
      calls.push('second');
      return 42;
    },
    async () => {
      calls.push('third');
      return 99;
    }
  ]);

  assert.equal(result, 42);
  assert.deepEqual(calls, ['first', 'second']);
});

test('firstSuccessful throws when all providers fail', async () => {
  await assert.rejects(
    () =>
      __internalApiClientHelpers.firstSuccessful([
        async () => {
          throw new Error('a failed');
        },
        async () => {
          throw new Error('b failed');
        }
      ]),
    /a failed/
  );
});


test('mergeSnapshotsBySymbol merges partial provider data into complete ordered result', () => {
  const merged = __internalApiClientHelpers.mergeSnapshotsBySymbol(
    ['BTC', 'ETH', 'XRP'],
    [
      [
        { symbol: 'BTC', name: 'Bitcoin', priceUsd: 1, change24hPct: 1, volume24hUsd: 1, marketCapUsd: 1 },
        { symbol: 'XRP', name: 'XRP', priceUsd: 3, change24hPct: 3, volume24hUsd: 3, marketCapUsd: 3 }
      ],
      [{ symbol: 'ETH', name: 'Ethereum', priceUsd: 2, change24hPct: 2, volume24hUsd: 2, marketCapUsd: 2 }]
    ]
  );

  assert.deepEqual(merged.map((row) => row.symbol), ['BTC', 'ETH', 'XRP']);
});

test('mergeSnapshotsBySymbol throws when still missing symbols after merging', () => {
  assert.throws(
    () =>
      __internalApiClientHelpers.mergeSnapshotsBySymbol(['BTC', 'ETH'], [
        [{ symbol: 'BTC', name: 'Bitcoin', priceUsd: 1, change24hPct: 1, volume24hUsd: 1, marketCapUsd: 1 }]
      ]),
    /ETH/
  );
});
