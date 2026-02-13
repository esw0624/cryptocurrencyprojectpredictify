import { z } from 'zod';

export const AssetSchema = z.object({
  symbol: z.string(),
  baseAsset: z.string(),
  quoteAsset: z.string(),
  exchange: z.string(),
  status: z.enum(['active', 'inactive']),
});

export const AssetsResponseSchema = z.object({
  assets: z.array(AssetSchema),
});

export const HistoryQuerySchema = z.object({
  symbol: z.string().min(1),
  interval: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']),
  limit: z.coerce.number().int().positive().max(1000).default(100),
});

export const HistoryPointSchema = z.object({
  timestamp: z.string().datetime(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

export const HistoryResponseSchema = z.object({
  symbol: z.string(),
  interval: z.string(),
  data: z.array(HistoryPointSchema),
});

export const PredictionsQuerySchema = z.object({
  symbol: z.string().min(1),
  horizon: z.coerce.number().int().positive().max(365).default(24),
});

export const PredictionPointSchema = z.object({
  timestamp: z.string().datetime(),
  predictedPrice: z.number(),
  confidence: z.number().min(0).max(1),
});

export const PredictionsResponseSchema = z.object({
  symbol: z.string(),
  horizon: z.number().int().positive(),
  predictions: z.array(PredictionPointSchema),
});

export const TrainModelRequestSchema = z.object({
  symbols: z.array(z.string()).min(1).max(20).optional(),
  force: z.boolean().optional().default(false),
});

export const TrainModelResponseSchema = z.object({
  started: z.boolean(),
  jobId: z.string(),
  queuedAt: z.string().datetime(),
  symbols: z.array(z.string()),
});

export type AssetDto = z.infer<typeof AssetSchema>;
export type AssetsResponseDto = z.infer<typeof AssetsResponseSchema>;
export type HistoryQueryDto = z.infer<typeof HistoryQuerySchema>;
export type HistoryPointDto = z.infer<typeof HistoryPointSchema>;
export type HistoryResponseDto = z.infer<typeof HistoryResponseSchema>;
export type PredictionsQueryDto = z.infer<typeof PredictionsQuerySchema>;
export type PredictionPointDto = z.infer<typeof PredictionPointSchema>;
export type PredictionsResponseDto = z.infer<typeof PredictionsResponseSchema>;
export type TrainModelRequestDto = z.infer<typeof TrainModelRequestSchema>;
export type TrainModelResponseDto = z.infer<typeof TrainModelResponseSchema>;
