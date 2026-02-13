export type SupportedSymbol = 'BTC-USD' | 'ETH-USD' | 'XRP-USD';

export const TOP_COIN_SYMBOLS: SupportedSymbol[] = ['BTC-USD', 'ETH-USD', 'XRP-USD'];

export interface UnifiedCandle {
  symbol: SupportedSymbol;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: 'coinbase' | 'kraken' | 'crypto.com';
}

export interface CandleProvider {
  readonly source: UnifiedCandle['source'];
  fetchCandles(symbol: SupportedSymbol, options?: ProviderFetchOptions): Promise<UnifiedCandle[]>;
}

export interface ProviderFetchOptions {
  /**
   * Candle width in seconds.
   * Examples: 60 = 1m, 300 = 5m, 3600 = 1h.
   */
  granularitySeconds?: number;
  /**
   * Optional start timestamp in seconds.
   */
  startTimeSeconds?: number;
  /**
   * Optional end timestamp in seconds.
   */
  endTimeSeconds?: number;
  /**
   * Optional maximum amount of data points requested.
   */
  limit?: number;
}
