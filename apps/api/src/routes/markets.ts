import { Router } from 'express';

const MARKET_DATA = {
  BTC: { name: 'Bitcoin', priceUsd: 68342.12, change24hPct: 1.82, volume24hUsd: 32450000000, marketCapUsd: 1346000000000 },
  ETH: { name: 'Ethereum', priceUsd: 3554.74, change24hPct: 1.26, volume24hUsd: 14500000000, marketCapUsd: 427000000000 },
  XRP: { name: 'XRP', priceUsd: 0.62, change24hPct: -0.74, volume24hUsd: 2100000000, marketCapUsd: 34800000000 },
} as const;

type MarketSymbol = keyof typeof MARKET_DATA;

export const marketsRouter = Router();

marketsRouter.get('/markets', (req, res) => {
  const symbolsParam = typeof req.query.symbols === 'string' ? req.query.symbols : '';
  const requestedSymbols = symbolsParam
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is MarketSymbol => value in MARKET_DATA);

  const symbols = requestedSymbols.length > 0 ? requestedSymbols : (Object.keys(MARKET_DATA) as MarketSymbol[]);

  const response = symbols.map((symbol) => ({
    symbol,
    ...MARKET_DATA[symbol],
  }));

  return res.json(response);
});
