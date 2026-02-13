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
