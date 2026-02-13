import { Router } from 'express';

const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'XRP'] as const;
const SUPPORTED_TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y'] as const;

type AssetSymbol = (typeof SUPPORTED_SYMBOLS)[number];
type Timeframe = (typeof SUPPORTED_TIMEFRAMES)[number];

const TIMEFRAME_POINTS: Record<Timeframe, number> = {
  '1D': 24,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
};

const BASE_PRICE: Record<AssetSymbol, number> = {
  BTC: 68000,
  ETH: 3500,
  XRP: 0.62,
};

export const historyRouter = Router();

historyRouter.get('/history', (req, res) => {
  const symbol = String(req.query.symbol ?? '').toUpperCase() as AssetSymbol;
  const timeframe = String(req.query.timeframe ?? '').toUpperCase() as Timeframe;

  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    return res.status(400).json({ error: 'symbol must be one of BTC, ETH, XRP' });
  }

  if (!SUPPORTED_TIMEFRAMES.includes(timeframe)) {
    return res.status(400).json({ error: 'timeframe must be one of 1D, 1W, 1M, 3M, 1Y' });
  }

  const points = TIMEFRAME_POINTS[timeframe];
  const now = Date.now();
  const stepMs = timeframe === '1D' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  const data = Array.from({ length: points }, (_, index) => {
    const t = points - index;
    const trend = Math.sin(t / 8) * (BASE_PRICE[symbol] * 0.015);
    const noise = Math.cos(t / 5) * (BASE_PRICE[symbol] * 0.004);
    const close = BASE_PRICE[symbol] + trend + noise;
    const open = close * (1 - 0.003);

    return {
      timestamp: new Date(now - t * stepMs).toISOString(),
      open: Number(open.toFixed(2)),
      high: Number((close * 1.006).toFixed(2)),
      low: Number((close * 0.994).toFixed(2)),
      close: Number(close.toFixed(2)),
    };
  });

  return res.json(data);
});
