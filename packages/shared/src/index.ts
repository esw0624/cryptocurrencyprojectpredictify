export * from './dto/index.js';

export interface MarketDataPoint {
  symbol: string;
  timestamp: string;
  priceUsd: number;
  volume24hUsd: number;
  source: 'coingecko' | 'alpha_vantage' | 'manual';
}

export interface IngestMarketDataRequest {
  points: MarketDataPoint[];
}

export interface PredictionRequest {
  symbol: string;
  horizonMinutes: number;
}

export interface PredictionResponse {
  symbol: string;
  horizonMinutes: number;
  predictedPriceUsd: number;
  confidence: number;
  generatedAt: string;
}
