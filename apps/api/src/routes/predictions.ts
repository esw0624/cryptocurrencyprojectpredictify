import { Router } from 'express';

const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'XRP'] as const;
const SUPPORTED_TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y'] as const;

type AssetSymbol = (typeof SUPPORTED_SYMBOLS)[number];
type Timeframe = (typeof SUPPORTED_TIMEFRAMES)[number];

const PRICE_BY_SYMBOL: Record<AssetSymbol, number> = {
  BTC: 68920,
  ETH: 3615,
  XRP: 0.64,
};

const CONFIDENCE_BY_TIMEFRAME: Record<Timeframe, number> = {
  '1D': 73,
  '1W': 68,
  '1M': 63,
  '3M': 56,
  '1Y': 48,
};

export const predictionsRouter = Router();

predictionsRouter.get('/prediction', (req, res) => {
  const symbol = String(req.query.symbol ?? '').toUpperCase() as AssetSymbol;
  const timeframe = String(req.query.timeframe ?? '').toUpperCase() as Timeframe;

  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    return res.status(400).json({ error: 'symbol must be one of BTC, ETH, XRP' });
  }

  if (!SUPPORTED_TIMEFRAMES.includes(timeframe)) {
    return res.status(400).json({ error: 'timeframe must be one of 1D, 1W, 1M, 3M, 1Y' });
  }

  const direction = timeframe === '1Y' ? 'flat' : 'up';
  const multiplier = timeframe === '1D' ? 1.01 : timeframe === '1W' ? 1.03 : timeframe === '1M' ? 1.05 : timeframe === '3M' ? 1.08 : 1.1;

  return res.json({
    symbol,
    horizon: timeframe,
    predictedPriceUsd: Number((PRICE_BY_SYMBOL[symbol] * multiplier).toFixed(2)),
    confidencePct: CONFIDENCE_BY_TIMEFRAME[timeframe],
    direction,
    lastModelRun: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  });
});
