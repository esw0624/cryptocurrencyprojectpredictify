import { IngestService } from '../services/ingestService';
import { TOP_COIN_SYMBOLS } from '../providers/types';

export interface IngestTopCoinsJobConfig {
  intervalMs?: number;
  granularitySeconds?: number;
  limit?: number;
}

export function startIngestTopCoinsJob(config: IngestTopCoinsJobConfig = {}): () => void {
  const ingestService = new IngestService();

  const run = async () => {
    const result = await ingestService.ingest(TOP_COIN_SYMBOLS, {
      granularitySeconds: config.granularitySeconds ?? 3600,
      limit: config.limit ?? 50,
    });

    if (result.errors.length > 0) {
      console.warn('[ingestTopCoins] Completed with provider errors:', result.errors);
    }

    console.info(`[ingestTopCoins] Ingested ${result.candles.length} candles.`);
  };

  void run();
  const intervalId = setInterval(() => {
    void run();
  }, config.intervalMs ?? 5 * 60 * 1000);

  return () => clearInterval(intervalId);
}
