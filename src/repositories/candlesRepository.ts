import { supabaseClient } from '../db/supabaseClient';

export type CandleInsert = {
  asset_id: string;
  source: string;
  granularity: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export async function writeCandles(candles: CandleInsert[]): Promise<void> {
  if (candles.length === 0) {
    return;
  }

  const { error } = await supabaseClient
    .from('candles')
    .upsert(candles, {
      onConflict: 'asset_id,source,granularity,timestamp',
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Failed to write candles: ${error.message}`);
  }
}
