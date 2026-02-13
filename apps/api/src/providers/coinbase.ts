import { CandleProvider, ProviderFetchOptions, SupportedSymbol, UnifiedCandle } from './types';

const COINBASE_BASE_URL = 'https://api.exchange.coinbase.com';

export class CoinbaseClient implements CandleProvider {
  readonly source = 'coinbase' as const;

  async fetchCandles(symbol: SupportedSymbol, options: ProviderFetchOptions = {}): Promise<UnifiedCandle[]> {
    const granularitySeconds = options.granularitySeconds ?? 3600;
    const url = new URL(`${COINBASE_BASE_URL}/products/${symbol}/candles`);

    url.searchParams.set('granularity', String(granularitySeconds));

    if (options.startTimeSeconds) {
      url.searchParams.set('start', new Date(options.startTimeSeconds * 1000).toISOString());
    }

    if (options.endTimeSeconds) {
      url.searchParams.set('end', new Date(options.endTimeSeconds * 1000).toISOString());
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Coinbase request failed (${response.status}): ${await response.text()}`);
    }

    const rawCandles = (await response.json()) as [number, number, number, number, number, number][];
    const candles = rawCandles
      .map(([time, low, high, open, close, volume]) => ({
        symbol,
        timestamp: time,
        open,
        high,
        low,
        close,
        volume,
        source: this.source,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (options.limit && options.limit > 0) {
      return candles.slice(-options.limit);
    }

    return candles;
  }
}
