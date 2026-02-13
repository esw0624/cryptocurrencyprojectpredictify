export type PriceSample = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type NormalizedPriceSample = PriceSample & {
  closeZScore: number;
  volumeRatio: number;
};

export type EngineeredFeatureSample = {
  timestamp: string;
  close: number;
  volume: number;
  closeChange: number;
  rangePct: number;
};

export function normalizePriceData(samples: PriceSample[]): NormalizedPriceSample[] {
  if (samples.length === 0) {
    return [];
  }

  const closes = samples.map((sample) => sample.close);
  const volumes = samples.map((sample) => sample.volume);

  const meanClose = average(closes);
  const stdClose = standardDeviation(closes, meanClose);
  const meanVolume = average(volumes);

  return samples.map((sample) => ({
    ...sample,
    closeZScore: stdClose === 0 ? 0 : (sample.close - meanClose) / stdClose,
    volumeRatio: meanVolume === 0 ? 0 : sample.volume / meanVolume
  }));
}

export function engineerFeatures(samples: PriceSample[]): EngineeredFeatureSample[] {
  return samples.map((sample, index) => {
    const previousClose = index === 0 ? sample.close : (samples[index - 1]?.close ?? sample.close);

    return {
      timestamp: sample.timestamp,
      close: sample.close,
      volume: sample.volume,
      closeChange: previousClose === 0 ? 0 : (sample.close - previousClose) / previousClose,
      rangePct: sample.open === 0 ? 0 : (sample.high - sample.low) / sample.open
    };
  });
}

function average(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function standardDeviation(values: number[], mean: number): number {
  const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
