import { CoinbaseClient } from '../providers/coinbase.js';
import { CryptoComClient } from '../providers/cryptoCom.js';
import { KrakenClient } from '../providers/kraken.js';
import {
  CandleProvider,
  ProviderFetchOptions,
  SupportedSymbol,
  TOP_COIN_SYMBOLS,
  UnifiedCandle,
} from '../providers/types.js';

export interface IngestResult {
  candles: UnifiedCandle[];
  errors: Array<{ source: string; symbol: SupportedSymbol; error: string }>;
}

export class IngestService {
  constructor(
    private readonly providers: CandleProvider[] = [
      new CoinbaseClient(),
      new KrakenClient(),
      new CryptoComClient(),
    ],
  ) {}

  async ingest(
    symbols: SupportedSymbol[] = TOP_COIN_SYMBOLS,
    options: ProviderFetchOptions = {},
  ): Promise<IngestResult> {
    const tasks = this.providers.flatMap((provider) =>
      symbols.map(async (symbol) => {
        try {
          const candles = await provider.fetchCandles(symbol, options);
          return { candles, errors: [] as IngestResult['errors'] };
        } catch (error) {
          return {
            candles: [] as UnifiedCandle[],
            errors: [
              {
                source: provider.source,
                symbol,
                error: error instanceof Error ? error.message : String(error),
              },
            ],
          };
        }
      }),
    );

    const settled = await Promise.all(tasks);

    const candles = settled
      .flatMap((result) => result.candles)
      .sort((a, b) => a.timestamp - b.timestamp);

    const errors = settled.flatMap((result) => result.errors);

    return { candles, errors };
  }
}
