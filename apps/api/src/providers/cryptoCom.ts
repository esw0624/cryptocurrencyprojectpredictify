import { CandleProvider, ProviderFetchOptions, SupportedSymbol, UnifiedCandle } from './types';

const CRYPTO_COM_BASE_URL = 'https://api.crypto.com/exchange/v1/public/get-candlestick';

const INSTRUMENT_MAP: Record<SupportedSymbol, string> = {
  'BTC-USD': 'BTC_USDT',
  'ETH-USD': 'ETH_USDT',
  'XRP-USD': 'XRP_USDT',
};

const TIMEFRAME_MAP: Record<number, string> = {
  60: '1m',
  300: '5m',
  900: '15m',
  1800: '30m',
  3600: '1h',
  14400: '4h',
  21600: '6h',
  43200: '12h',
  86400: '1D',
  604800: '7D',
  1209600: '14D',
  2592000: '1M',
};

type CryptoComCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

type CryptoComResponse = {
  code: number;
  result?: {
    data?: CryptoComCandle[];
  };
  message?: string;
};

function toTimeframe(granularitySeconds: number): string {
  return TIMEFRAME_MAP[granularitySeconds] ?? '1h';
}

export class CryptoComClient implements CandleProvider {
  readonly source = 'crypto.com' as const;

  async fetchCandles(symbol: SupportedSymbol, options: ProviderFetchOptions = {}): Promise<UnifiedCandle[]> {
    const granularitySeconds = options.granularitySeconds ?? 3600;

    const url = new URL(CRYPTO_COM_BASE_URL);
    url.searchParams.set('instrument_name', INSTRUMENT_MAP[symbol]);
    url.searchParams.set('timeframe', toTimeframe(granularitySeconds));

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Crypto.com request failed (${response.status}): ${await response.text()}`);
    }

    const payload = (await response.json()) as CryptoComResponse;

    if (payload.code !== 0) {
      throw new Error(`Crypto.com request failed: ${payload.message ?? 'unknown error'}`);
    }

    const candles = (payload.result?.data ?? [])
      .map((candle) => ({
        symbol,
        timestamp: Math.floor(candle.t / 1000),
        open: Number(candle.o),
        high: Number(candle.h),
        low: Number(candle.l),
        close: Number(candle.c),
        volume: Number(candle.v),
        source: this.source,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    const filteredByRange = candles.filter((candle) => {
      if (options.startTimeSeconds && candle.timestamp < options.startTimeSeconds) {
        return false;
      }
      if (options.endTimeSeconds && candle.timestamp > options.endTimeSeconds) {
        return false;
      }
      return true;
    });

    if (options.limit && options.limit > 0) {
      return filteredByRange.slice(-options.limit);
    }

    return filteredByRange;
  }
}
