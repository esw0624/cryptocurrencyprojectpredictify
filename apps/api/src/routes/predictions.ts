import { Router } from 'express';

const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'XRP'] as const;
const SUPPORTED_TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y'] as const;

type AssetSymbol = (typeof SUPPORTED_SYMBOLS)[number];
type Timeframe = (typeof SUPPORTED_TIMEFRAMES)[number];

type PredictionSummary = {
  symbol: AssetSymbol;
  horizonDays: number;
  currentPriceUsd: number;
  predictedPriceUsd: number;
  lowEstimateUsd: number;
  highEstimateUsd: number;
  confidencePct: number;
  direction: 'up' | 'down' | 'flat';
  lastModelRun: string;
};

const BINANCE_KLINES_URL = 'https://api.binance.com/api/v3/klines';
const SYMBOL_TO_TICKER: Record<AssetSymbol, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  XRP: 'XRPUSDT',
};

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
};

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

function mean(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0) / Math.max(values.length, 1);
}

function std(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const variance = values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function getRecentCloses(symbol: AssetSymbol): Promise<number[]> {
  const params = new URLSearchParams({
    symbol: SYMBOL_TO_TICKER[symbol],
    interval: '1d',
    limit: '120',
  });

  const response = await fetch(`${BINANCE_KLINES_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch history for ${symbol} (${response.status}).`);
  }

  const rows = (await response.json()) as BinanceKline[];
  const closes = rows.map((row) => Number(row[4])).filter((value) => Number.isFinite(value) && value > 0);

  if (closes.length < 30) {
    throw new Error(`Not enough history to generate prediction for ${symbol}.`);
  }

  return closes;
}

async function buildPrediction(symbol: AssetSymbol, horizonDays: number): Promise<PredictionSummary> {
  const closes = await getRecentCloses(symbol);
  const returns = closes.slice(1).map((close, index) => (close - closes[index]) / closes[index]);

  const drift = mean(returns);
  const volatility = std(returns);
  const currentPriceUsd = closes[closes.length - 1];

  const expectedReturn = drift * horizonDays;
  const uncertaintyBand = Math.max(volatility * Math.sqrt(horizonDays) * 1.28, 0.01);

  const predictedPriceUsd = currentPriceUsd * (1 + expectedReturn);
  const lowEstimateUsd = currentPriceUsd * (1 + expectedReturn - uncertaintyBand);
  const highEstimateUsd = currentPriceUsd * (1 + expectedReturn + uncertaintyBand);

  const direction: PredictionSummary['direction'] =
    expectedReturn > 0.01 ? 'up' : expectedReturn < -0.01 ? 'down' : 'flat';

  return {
    symbol,
    horizonDays,
    currentPriceUsd: Number(currentPriceUsd.toFixed(2)),
    predictedPriceUsd: Number(Math.max(predictedPriceUsd, 0).toFixed(2)),
    lowEstimateUsd: Number(Math.max(lowEstimateUsd, 0).toFixed(2)),
    highEstimateUsd: Number(Math.max(highEstimateUsd, 0).toFixed(2)),
    confidencePct: Number((clamp((1 - volatility * Math.sqrt(horizonDays)) * 100, 35, 92)).toFixed(1)),
    direction,
    lastModelRun: new Date().toISOString(),
  };
}

export const predictionsRouter = Router();

predictionsRouter.get('/prediction', async (req, res, next) => {
  try {
    const symbol = String(req.query.symbol ?? '').toUpperCase() as AssetSymbol;
    const timeframe = String(req.query.timeframe ?? '').toUpperCase() as Timeframe;

    if (!SUPPORTED_SYMBOLS.includes(symbol)) {
      return res.status(400).json({ error: 'symbol must be one of BTC, ETH, XRP' });
    }

    if (!SUPPORTED_TIMEFRAMES.includes(timeframe)) {
      return res.status(400).json({ error: 'timeframe must be one of 1D, 1W, 1M, 3M, 1Y' });
    }

    const summary = await buildPrediction(symbol, TIMEFRAME_DAYS[timeframe]);

    return res.json({
      symbol,
      horizon: timeframe,
      predictedPriceUsd: summary.predictedPriceUsd,
      confidencePct: summary.confidencePct,
      direction: summary.direction,
      lastModelRun: summary.lastModelRun,
    });
  } catch (error) {
    return next(error);
  }
});

predictionsRouter.post('/predictions/by-date', async (req, res, next) => {
  try {
    const symbol = String(req.body?.symbol ?? '').toUpperCase() as AssetSymbol;
    const targetDateIso = String(req.body?.targetDateIso ?? '');

    if (!SUPPORTED_SYMBOLS.includes(symbol)) {
      return res.status(400).json({ error: 'symbol must be one of BTC, ETH, XRP' });
    }

    const targetTs = Date.parse(targetDateIso);
    if (!Number.isFinite(targetTs)) {
      return res.status(400).json({ error: 'targetDateIso must be a valid ISO date string' });
    }

    const nowTs = Date.now();
    if (targetTs <= nowTs) {
      return res.status(400).json({ error: 'targetDateIso must be in the future' });
    }

    const horizonDays = Math.ceil((targetTs - nowTs) / (24 * 60 * 60 * 1000));
    if (horizonDays > 730) {
      return res.status(400).json({ error: 'targetDateIso is too far out (max 730 days)' });
    }

    const summary = await buildPrediction(symbol, horizonDays);

    return res.json({
      symbol,
      targetDateIso: new Date(targetTs).toISOString(),
      generatedAt: new Date().toISOString(),
      horizonDays: summary.horizonDays,
      currentPriceUsd: summary.currentPriceUsd,
      predictedPriceUsd: summary.predictedPriceUsd,
      lowEstimateUsd: summary.lowEstimateUsd,
      highEstimateUsd: summary.highEstimateUsd,
      confidencePct: summary.confidencePct,
      direction: summary.direction,
      modelRunId: `baseline-drift-${symbol.toLowerCase()}`,
      lastModelRun: summary.lastModelRun,
    });
  } catch (error) {
    return next(error);
  }
});
