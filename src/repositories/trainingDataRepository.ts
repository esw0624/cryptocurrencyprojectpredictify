import { supabaseClient } from '../db/supabaseClient';

export type TrainingCandle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TrainingDataQuery = {
  assetId: string;
  source: string;
  granularity: string;
  startTimestamp: string;
  endTimestamp: string;
};

export async function readTrainingCandles({
  assetId,
  source,
  granularity,
  startTimestamp,
  endTimestamp,
}: TrainingDataQuery): Promise<TrainingCandle[]> {
  const { data, error } = await supabaseClient
    .from('candles')
    .select('timestamp,open,high,low,close,volume')
    .eq('asset_id', assetId)
    .eq('source', source)
    .eq('granularity', granularity)
    .gte('timestamp', startTimestamp)
    .lte('timestamp', endTimestamp)
    .order('timestamp', { ascending: true });

  if (error) {
    throw new Error(`Failed to read training candles: ${error.message}`);
  }

  return (data ?? []) as TrainingCandle[];
}
