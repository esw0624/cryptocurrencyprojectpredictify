export type AssetSymbol = 'BTC' | 'ETH' | 'XRP';
export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

type BinanceSymbol = 'BTCUSDT' | 'ETHUSDT' | 'XRPUSDT';
type CoinGeckoAssetId = 'bitcoin' | 'ethereum' | 'ripple';
type CoinCapAssetId = 'bitcoin' | 'ethereum' | 'xrp';

export interface MarketSnapshot {
  symbol: AssetSymbol;
  name: string;
  priceUsd: number;
  change24hPct: number;
  volume24hUsd: number;
  marketCapUsd: number;
}

export interface HistoricalCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PredictionResponse {
  symbol: AssetSymbol;
  horizon: string;
  predictedPriceUsd: number;
  confidencePct: number;
  direction: 'up' | 'down' | 'flat';
  lastModelRun: string;
}

export interface DatePredictionResponse {
  symbol: AssetSymbol;
  targetDateIso: string;
  generatedAt: string;
  horizonDays: number;
  currentPriceUsd: number;
  predictedPriceUsd: number;
  lowEstimateUsd: number;
  highEstimateUsd: number;
  confidencePct: number;
  direction: 'up' | 'down' | 'flat';
  modelRunId: string;
  lastModelRun: string;
}

const ASSET_CONFIG: Record<AssetSymbol, { ticker: BinanceSymbol; name: string }> = {
  BTC: { ticker: 'BTCUSDT', name: 'Bitcoin' },
  ETH: { ticker: 'ETHUSDT', name: 'Ethereum' },
  XRP: { ticker: 'XRPUSDT', name: 'XRP' }
};

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINCAP_BASE_URL = 'https://api.coincap.io/v2';
const CONFIGURED_API_BASE_URL = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL?.replace(/\/$/, '');
const API_BASE_URL =
  CONFIGURED_API_BASE_URL ??
  (typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
    ? 'http://localhost:3000/api'
    : null);
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const CACHE_PREFIX = 'predictify-cache-v1';
const HISTORY_TTL_MS = 60_000;
const MARKET_TTL_MS = 15_000;

type TimedCacheEntry<T> = {
  data: T;
  cachedAt: number;
};

const memoryCache = new Map<string, TimedCacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

function requestError(response: Response, body: string) {
  if (body) {
    try {
      const parsed = JSON.parse(body) as { msg?: string };
      if (parsed.msg) return parsed.msg;
    } catch {
      // Ignore parse failures and fall back to raw text.
    }
  }

  return body || `Request failed with ${response.status}`;
}

function cacheKey(key: string) {
  return `${CACHE_PREFIX}:${key}`;
}

function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(cacheKey(key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function readMemoryCache<T>(key: string, ttlMs: number): T | null {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > ttlMs) {
    memoryCache.delete(key);
    return null;
  }

  return cached.data as T;
}

function writeMemoryCache<T>(key: string, data: T) {
  memoryCache.set(key, { data, cachedAt: Date.now() });
}

async function dedupeRequest<T>(key: string, execute: () => Promise<T>): Promise<T> {
  const active = inflightRequests.get(key) as Promise<T> | undefined;
  if (active) return active;

  const requestPromise = execute().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, requestPromise);
  return requestPromise;
}

function writeCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(cacheKey(key), JSON.stringify(data));
  } catch {
    // Ignore quota and serialization errors.
  }
}

async function request<T>(url: string, init?: RequestInit, retry = MAX_RETRIES): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const message = await response.text();
      const error = new Error(requestError(response, message)) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    return response.json() as Promise<T>;
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? Number((error as { status?: number }).status) : undefined;
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    const shouldRetry =
      isAbort ||
      status === 429 ||
      status === undefined ||
      (typeof status === 'number' && status >= 500);

    if (retry > 0 && shouldRetry) {
      await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAY_MS * (MAX_RETRIES - retry + 1)));
      return request<T>(url, init, retry - 1);
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

interface BinanceTicker24h {
  symbol: BinanceSymbol;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

interface CoinGeckoMarket {
  id: CoinGeckoAssetId;
  current_price: number;
  price_change_percentage_24h_in_currency: number | null;
  total_volume: number;
  market_cap: number;
}

interface CoinGeckoMarketChart {
  prices: [number, number][];
}

interface CoinCapAsset {
  id: CoinCapAssetId;
  priceUsd: string;
  changePercent24Hr: string;
  volumeUsd24Hr: string;
  marketCapUsd: string;
}

interface CoinCapAssetsResponse {
  data: CoinCapAsset[];
}

interface CoinCapHistoryPoint {
  priceUsd: string;
  time: number;
}

interface CoinCapHistoryResponse {
  data: CoinCapHistoryPoint[];
}

function ensureAllRequestedSymbols<T extends { symbol: AssetSymbol }>(
  providerName: string,
  requestedSymbols: AssetSymbol[],
  rows: T[]
): T[] {
  const bySymbol = new Map(rows.map((row) => [row.symbol, row]));
  const missing = requestedSymbols.filter((symbol) => !bySymbol.has(symbol));

  if (missing.length > 0) {
    throw new Error(`${providerName} response is missing ${missing.join(', ')}`);
  }

  return requestedSymbols.map((symbol) => bySymbol.get(symbol) as T);
}

function mergeSnapshotsBySymbol(requestedSymbols: AssetSymbol[], sources: MarketSnapshot[][]): MarketSnapshot[] {
  const merged = new Map<AssetSymbol, MarketSnapshot>();

  for (const rows of sources) {
    for (const row of rows) {
      if (!merged.has(row.symbol)) {
        merged.set(row.symbol, row);
      }
    }
  }

  const missing = requestedSymbols.filter((symbol) => !merged.has(symbol));
  if (missing.length > 0) {
    throw new Error(`Unable to load market snapshots for ${missing.join(', ')}`);
  }

  return requestedSymbols.map((symbol) => merged.get(symbol) as MarketSnapshot);
}

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
  string
];

function toAssetSymbol(ticker: BinanceSymbol): AssetSymbol {
  switch (ticker) {
    case 'BTCUSDT':
      return 'BTC';
    case 'ETHUSDT':
      return 'ETH';
    case 'XRPUSDT':
      return 'XRP';
  }
}

function toCoinGeckoAssetId(symbol: AssetSymbol): CoinGeckoAssetId {
  switch (symbol) {
    case 'BTC':
      return 'bitcoin';
    case 'ETH':
      return 'ethereum';
    case 'XRP':
      return 'ripple';
  }
}

function toCoinCapAssetId(symbol: AssetSymbol): CoinCapAssetId {
  switch (symbol) {
    case 'BTC':
      return 'bitcoin';
    case 'ETH':
      return 'ethereum';
    case 'XRP':
      return 'xrp';
  }
}

function fromCoinCapAssetId(assetId: CoinCapAssetId): AssetSymbol {
  switch (assetId) {
    case 'bitcoin':
      return 'BTC';
    case 'ethereum':
      return 'ETH';
    case 'xrp':
      return 'XRP';
  }
}

function fromCoinGeckoAssetId(assetId: CoinGeckoAssetId): AssetSymbol {
  switch (assetId) {
    case 'bitcoin':
      return 'BTC';
    case 'ethereum':
      return 'ETH';
    case 'ripple':
      return 'XRP';
  }
}

function toBinanceTimeframe(timeframe: Timeframe): { interval: string; limit: number } {
  switch (timeframe) {
    case '1D':
      return { interval: '5m', limit: 288 };
    case '1W':
      return { interval: '1h', limit: 168 };
    case '1M':
      return { interval: '4h', limit: 180 };
    case '3M':
      return { interval: '12h', limit: 180 };
    case '1Y':
      return { interval: '1d', limit: 365 };
    default:
      return { interval: '4h', limit: 180 };
  }
}

function toCoinCapInterval(timeframe: Timeframe): { interval: 'm5' | 'h1' | 'h6' | 'd1'; lookbackMs: number } {
  const dayMs = 24 * 60 * 60 * 1000;

  switch (timeframe) {
    case '1D':
      return { interval: 'm5', lookbackMs: dayMs };
    case '1W':
      return { interval: 'h1', lookbackMs: dayMs * 7 };
    case '1M':
      return { interval: 'h6', lookbackMs: dayMs * 30 };
    case '3M':
      return { interval: 'h6', lookbackMs: dayMs * 90 };
    case '1Y':
      return { interval: 'd1', lookbackMs: dayMs * 365 };
    default:
      return { interval: 'h6', lookbackMs: dayMs * 30 };
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toCoinGeckoDays(timeframe: Timeframe): string {
  switch (timeframe) {
    case '1D':
      return '1';
    case '1W':
      return '7';
    case '1M':
      return '30';
    case '3M':
      return '90';
    case '1Y':
      return '365';
    default:
      return '30';
  }
}

function buildPrediction(symbol: AssetSymbol, timeframe: Timeframe, history: HistoricalCandle[]): PredictionResponse {
  const first = history[0]?.close ?? 0;
  const last = history.at(-1)?.close ?? 0;
  const momentum = first === 0 ? 0 : (last - first) / first;
  const projectedMove = momentum * 0.25;
  const predictedPriceUsd = Math.max(last * (1 + projectedMove), 0);
  const direction: PredictionResponse['direction'] =
    projectedMove > 0.005 ? 'up' : projectedMove < -0.005 ? 'down' : 'flat';

  return {
    symbol,
    horizon: timeframe,
    predictedPriceUsd,
    confidencePct: Math.min(Math.abs(momentum) * 100 + 55, 92),
    direction,
    lastModelRun: new Date().toISOString()
  };
}

async function getMarketSnapshotsFromApi(symbols: AssetSymbol[]): Promise<MarketSnapshot[]> {
  if (!API_BASE_URL) throw new Error('API base URL not configured.');
  const params = new URLSearchParams({ symbols: symbols.join(',') });
  return request<MarketSnapshot[]>(`${API_BASE_URL}/markets?${params.toString()}`);
}

async function getHistoricalDataFromApi(symbol: AssetSymbol, timeframe: Timeframe): Promise<HistoricalCandle[]> {
  if (!API_BASE_URL) throw new Error('API base URL not configured.');
  const params = new URLSearchParams({ symbol, timeframe });
  return request<HistoricalCandle[]>(`${API_BASE_URL}/history?${params.toString()}`);
}

async function getPredictionFromApi(symbol: AssetSymbol, timeframe: Timeframe): Promise<PredictionResponse> {
  if (!API_BASE_URL) throw new Error('API base URL not configured.');
  const params = new URLSearchParams({ symbol, timeframe });
  return request<PredictionResponse>(`${API_BASE_URL}/prediction?${params.toString()}`);
}

async function getDatePredictionFromApi(symbol: AssetSymbol, targetDateIso: string): Promise<DatePredictionResponse> {
  if (!API_BASE_URL) throw new Error('API base URL not configured.');
  return request<DatePredictionResponse>(`${API_BASE_URL}/predictions/by-date`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, targetDateIso })
  });
}

async function firstSuccessful<T>(requests: Array<() => Promise<T>>): Promise<T> {
  let firstError: unknown;

  for (const run of requests) {
    try {
      return await run();
    } catch (error) {
      if (firstError === undefined) {
        firstError = error;
      }
    }
  }

  if (firstError instanceof Error) {
    throw firstError;
  }

  throw new Error('All providers failed.');
}

async function getMarketSnapshotsFromBinance(symbols: AssetSymbol[]): Promise<MarketSnapshot[]> {
  const tickers = symbols.map((symbol) => ASSET_CONFIG[symbol].ticker);
  const query = encodeURIComponent(JSON.stringify(tickers));
  const marketData = await request<BinanceTicker24h[]>(`${BINANCE_BASE_URL}/ticker/24hr?symbols=${query}`);

  const mapped = marketData.map((item) => {
    const symbol = toAssetSymbol(item.symbol);
    return {
      symbol,
      name: ASSET_CONFIG[symbol].name,
      priceUsd: Number(item.lastPrice),
      change24hPct: Number(item.priceChangePercent),
      volume24hUsd: Number(item.quoteVolume),
      marketCapUsd: 0
    };
  });

  return ensureAllRequestedSymbols('Binance', symbols, mapped);
}

async function getMarketSnapshotsFromCoinGecko(symbols: AssetSymbol[]): Promise<MarketSnapshot[]> {
  const ids = symbols.map(toCoinGeckoAssetId).join(',');
  const params = new URLSearchParams({
    vs_currency: 'usd',
    ids,
    price_change_percentage: '24h'
  });

  const marketData = await request<CoinGeckoMarket[]>(`${COINGECKO_BASE_URL}/coins/markets?${params.toString()}`);

  const mapped = marketData.map((item) => {
    const symbol = fromCoinGeckoAssetId(item.id);
    return {
      symbol,
      name: ASSET_CONFIG[symbol].name,
      priceUsd: item.current_price,
      change24hPct: item.price_change_percentage_24h_in_currency ?? 0,
      volume24hUsd: item.total_volume,
      marketCapUsd: item.market_cap
    };
  });

  return ensureAllRequestedSymbols('CoinGecko', symbols, mapped);
}

async function getMarketSnapshotsFromCoinCap(symbols: AssetSymbol[]): Promise<MarketSnapshot[]> {
  const ids = symbols.map(toCoinCapAssetId).join(',');
  const response = await request<CoinCapAssetsResponse>(`${COINCAP_BASE_URL}/assets?ids=${ids}`);

  const mapped = response.data.map((item) => {
    const symbol = fromCoinCapAssetId(item.id);
    return {
      symbol,
      name: ASSET_CONFIG[symbol].name,
      priceUsd: Number(item.priceUsd),
      change24hPct: Number(item.changePercent24Hr),
      volume24hUsd: Number(item.volumeUsd24Hr),
      marketCapUsd: Number(item.marketCapUsd)
    };
  });

  return ensureAllRequestedSymbols('CoinCap', symbols, mapped);
}

async function getHistoricalDataFromBinance(symbol: AssetSymbol, timeframe: Timeframe): Promise<HistoricalCandle[]> {
  const coinTicker = ASSET_CONFIG[symbol].ticker;
  const { interval, limit } = toBinanceTimeframe(timeframe);
  const history = await request<BinanceKline[]>(
    `${BINANCE_BASE_URL}/klines?symbol=${coinTicker}&interval=${interval}&limit=${limit}`
  );

  return history.map((candle) => ({
    timestamp: new Date(candle[0]).toISOString(),
    open: Number(candle[1]),
    high: Number(candle[2]),
    low: Number(candle[3]),
    close: Number(candle[4])
  }));
}

async function getHistoricalDataFromCoinGecko(symbol: AssetSymbol, timeframe: Timeframe): Promise<HistoricalCandle[]> {
  const assetId = toCoinGeckoAssetId(symbol);
  const params = new URLSearchParams({
    vs_currency: 'usd',
    days: toCoinGeckoDays(timeframe)
  });

  const history = await request<CoinGeckoMarketChart>(
    `${COINGECKO_BASE_URL}/coins/${assetId}/market_chart?${params.toString()}`
  );

  return history.prices.map(([timestamp, price]) => ({
    timestamp: new Date(timestamp).toISOString(),
    open: price,
    high: price,
    low: price,
    close: price
  }));
}

async function getHistoricalDataFromCoinCap(symbol: AssetSymbol, timeframe: Timeframe): Promise<HistoricalCandle[]> {
  const assetId = toCoinCapAssetId(symbol);
  const { interval, lookbackMs } = toCoinCapInterval(timeframe);
  const end = Date.now();
  const start = end - lookbackMs;
  const params = new URLSearchParams({
    interval,
    start: String(start),
    end: String(end)
  });

  const response = await request<CoinCapHistoryResponse>(
    `${COINCAP_BASE_URL}/assets/${assetId}/history?${params.toString()}`
  );

  return response.data.map((point) => {
    const price = Number(point.priceUsd);
    return {
      timestamp: new Date(point.time).toISOString(),
      open: price,
      high: price,
      low: price,
      close: price
    };
  });
}

export const apiClient = {
  async getMarketSnapshots(symbols: AssetSymbol[]) {
    const cacheToken = `markets:${symbols.join(',')}`;
    const memoryCached = readMemoryCache<MarketSnapshot[]>(cacheToken, MARKET_TTL_MS);
    if (memoryCached?.length) return memoryCached;

    return dedupeRequest(cacheToken, async () => {
      try {
        const data = await getMarketSnapshotsFromApi(symbols);
        writeCache(cacheToken, data);
        writeMemoryCache(cacheToken, data);
        return data;
      } catch {
        try {
          const providerResults = await Promise.allSettled([
            getMarketSnapshotsFromBinance(symbols),
            getMarketSnapshotsFromCoinCap(symbols),
            getMarketSnapshotsFromCoinGecko(symbols)
          ]);

          const snapshots = mergeSnapshotsBySymbol(
            symbols,
            providerResults
              .filter((result): result is PromiseFulfilledResult<MarketSnapshot[]> => result.status === 'fulfilled')
              .map((result) => result.value)
          );

          writeCache(cacheToken, snapshots);
          writeMemoryCache(cacheToken, snapshots);
          return snapshots;
        } catch {
          const cached = readCache<MarketSnapshot[]>(cacheToken);
          if (cached?.length) {
            writeMemoryCache(cacheToken, cached);
            return cached;
          }
          throw new Error('Unable to load market snapshots from live providers.');
        }
      }
    });
  },

  async getHistoricalData(symbol: AssetSymbol, timeframe: Timeframe) {
    const cacheToken = `history:${symbol}:${timeframe}`;
    const memoryCached = readMemoryCache<HistoricalCandle[]>(cacheToken, HISTORY_TTL_MS);
    if (memoryCached?.length) return memoryCached;

    return dedupeRequest(cacheToken, async () => {
      try {
        const data = await getHistoricalDataFromApi(symbol, timeframe);
        writeCache(cacheToken, data);
        writeMemoryCache(cacheToken, data);
        return data;
      } catch {
        try {
          const data = await firstSuccessful([
            () => getHistoricalDataFromBinance(symbol, timeframe),
            () => getHistoricalDataFromCoinCap(symbol, timeframe),
            () => getHistoricalDataFromCoinGecko(symbol, timeframe)
          ]);
          writeCache(cacheToken, data);
          writeMemoryCache(cacheToken, data);
          return data;
        } catch {
          const cached = readCache<HistoricalCandle[]>(cacheToken);
          if (cached?.length) {
            writeMemoryCache(cacheToken, cached);
            return cached;
          }
          throw new Error(`Unable to load historical data for ${symbol}.`);
        }
      }
    });
  },

  async getPrediction(symbol: AssetSymbol, timeframe: Timeframe, history?: HistoricalCandle[]) {
    try {
      return await getPredictionFromApi(symbol, timeframe);
    } catch {
      const sourceHistory = history ?? (await this.getHistoricalData(symbol, timeframe));
      return buildPrediction(symbol, timeframe, sourceHistory);
    }
  },

  async getPredictionByDate(symbol: AssetSymbol, targetDateIso: string) {
    return getDatePredictionFromApi(symbol, targetDateIso);
  },
};


export const __internalApiClientHelpers = {
  ensureAllRequestedSymbols,
  firstSuccessful,
  mergeSnapshotsBySymbol
};
