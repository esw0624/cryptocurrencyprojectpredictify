import { Router } from 'express';

const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'XRP'] as const;
type MarketSymbol = (typeof SUPPORTED_SYMBOLS)[number];

type LiveMarketSnapshot = {
  symbol: MarketSymbol;
  name: string;
  priceUsd: number;
  change24hPct: number;
  volume24hUsd: number;
  marketCapUsd: number;
};

const MARKET_META: Record<MarketSymbol, { name: string; ticker: string; fallbackMarketCapUsd: number }> = {
  BTC: { name: 'Bitcoin', ticker: 'BTCUSDT', fallbackMarketCapUsd: 1_346_000_000_000 },
  ETH: { name: 'Ethereum', ticker: 'ETHUSDT', fallbackMarketCapUsd: 427_000_000_000 },
  XRP: { name: 'XRP', ticker: 'XRPUSDT', fallbackMarketCapUsd: 34_800_000_000 },
};

const BINANCE_TICKER_URL = 'https://api.binance.com/api/v3/ticker/24hr';

interface BinanceTicker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

async function fetchLiveSnapshots(symbols: MarketSymbol[]): Promise<LiveMarketSnapshot[]> {
  const tickers = symbols.map((symbol) => MARKET_META[symbol].ticker);
  const encodedSymbols = encodeURIComponent(JSON.stringify(tickers));
  const response = await fetch(`${BINANCE_TICKER_URL}?symbols=${encodedSymbols}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch Binance markets (${response.status}).`);
  }

  const payload = (await response.json()) as BinanceTicker24h[];
  const byTicker = new Map(payload.map((row) => [row.symbol, row]));

  return symbols.map((symbol) => {
    const tickerRow = byTicker.get(MARKET_META[symbol].ticker);
    if (!tickerRow) {
      throw new Error(`Live market payload missing ${MARKET_META[symbol].ticker}.`);
    }

    return {
      symbol,
      name: MARKET_META[symbol].name,
      priceUsd: Number(tickerRow.lastPrice),
      change24hPct: Number(tickerRow.priceChangePercent),
      volume24hUsd: Number(tickerRow.quoteVolume),
      marketCapUsd: MARKET_META[symbol].fallbackMarketCapUsd,
    };
  });
}

function parseRequestedSymbols(input: unknown): MarketSymbol[] {
  const symbolsParam = typeof input === 'string' ? input : '';
  const requestedSymbols = symbolsParam
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is MarketSymbol => SUPPORTED_SYMBOLS.includes(value as MarketSymbol));

  return requestedSymbols.length > 0 ? requestedSymbols : [...SUPPORTED_SYMBOLS];
}

export const marketsRouter = Router();

marketsRouter.get('/markets', async (req, res, next) => {
  try {
    const symbols = parseRequestedSymbols(req.query.symbols);
    const data = await fetchLiveSnapshots(symbols);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

marketsRouter.get('/markets/live', async (req, res, next) => {
  try {
    const symbols = parseRequestedSymbols(req.query.symbols);
    const data = await fetchLiveSnapshots(symbols);
    return res.json({ updatedAt: new Date().toISOString(), data });
  } catch (error) {
    return next(error);
  }
});

marketsRouter.get('/markets/stream', async (req, res) => {
  const symbols = parseRequestedSymbols(req.query.symbols);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const pushFrame = async () => {
    try {
      const data = await fetchLiveSnapshots(symbols);
      res.write(`event: market\n`);
      res.write(`data: ${JSON.stringify({ updatedAt: new Date().toISOString(), data })}\n\n`);
    } catch (error) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: error instanceof Error ? error.message : 'stream failed' })}\n\n`);
    }
  };

  await pushFrame();
  const intervalId = setInterval(() => {
    void pushFrame();
  }, 2000);

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});
