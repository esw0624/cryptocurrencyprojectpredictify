import { CandleProvider, ProviderFetchOptions, SupportedSymbol, UnifiedCandle } from './types.js';

const KRAKEN_BASE_URL = 'https://api.kraken.com/0/public/OHLC';

const KRAKEN_PAIR_MAP: Record<SupportedSymbol, string> = {
  'BTC-USD': 'XBTUSD',
  'ETH-USD': 'ETHUSD',
  'XRP-USD': 'XRPUSD',
};

type KrakenOHLCResponse = {
  error: string[];
  result: {
    last: number;
    [pair: string]: unknown;
  };
};

export class KrakenClient implements CandleProvider {
  readonly source = 'kraken' as const;

  async fetchCandles(symbol: SupportedSymbol, options: ProviderFetchOptions = {}): Promise<UnifiedCandle[]> {
    const intervalMinutes = Math.max(1, Math.floor((options.granularitySeconds ?? 3600) / 60));
    const pair = KRAKEN_PAIR_MAP[symbol];

    const url = new URL(KRAKEN_BASE_URL);
    url.searchParams.set('pair', pair);
    url.searchParams.set('interval', String(intervalMinutes));

    if (options.startTimeSeconds) {
      url.searchParams.set('since', String(options.startTimeSeconds));
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Kraken request failed (${response.status}): ${await response.text()}`);
    }

    const payload = (await response.json()) as KrakenOHLCResponse;

    if (payload.error.length > 0) {
      throw new Error(`Kraken request failed: ${payload.error.join(', ')}`);
    }

    const resultKey = Object.keys(payload.result).find((key) => key !== 'last');
    if (!resultKey) {
      return [];
    }

    const ohlcRows = payload.result[resultKey] as string[][];

    const candles = ohlcRows
      .map((row) => {
        const [time, open, high, low, close, _vwap, volume] = row;
        return {
          symbol,
          timestamp: Number(time),
          open: Number(open),
          high: Number(high),
          low: Number(low),
          close: Number(close),
          volume: Number(volume),
          source: this.source,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    if (options.limit && options.limit > 0) {
      return candles.slice(-options.limit);
    }

    return candles;
  }
}
