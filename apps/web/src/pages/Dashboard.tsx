import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AssetSelector } from '../components/AssetSelector';
import { MarketCard } from '../components/MarketCard';
import { PredictionPanel } from '../components/PredictionPanel';
import { PriceChart } from '../components/PriceChart';
import { TimeframeControls } from '../components/TimeframeControls';
import { apiClient, type AssetSymbol, type HistoricalCandle, type MarketSnapshot, type PredictionResponse, type Timeframe } from '../lib/apiClient';

const TRACKED_ASSETS: AssetSymbol[] = ['BTC', 'ETH', 'XRP'];
const WS_STREAM_SYMBOL: Record<AssetSymbol, string> = {
  BTC: 'btcusdt',
  ETH: 'ethusdt',
  XRP: 'xrpusdt'
};

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function performanceLabel(percent: number) {
  if (percent > 4) return 'on fire';
  if (percent > 0.5) return 'trending up';
  if (percent < -4) return 'rough session';
  if (percent < -0.5) return 'pullback mode';
  return 'sideways vibe';
}

export function Dashboard() {
  const [markets, setMarkets] = useState<MarketSnapshot[]>([]);
  const [history, setHistory] = useState<HistoricalCandle[]>([]);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>('BTC');
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [chartMode, setChartMode] = useState<'line' | 'candlestick'>('line');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const remainingAssets = TRACKED_ASSETS.filter((asset) => asset !== selectedAsset);
    void Promise.allSettled(remainingAssets.map((asset) => apiClient.getHistoricalData(asset, timeframe)));
  }, [selectedAsset, timeframe]);

  useEffect(() => {
    let isMounted = true;

    async function loadData(showLoadingState: boolean) {
      if (showLoadingState) {
        setLoading(true);
      }
      setError(null);

      try {
        const [marketData, historicalData] = await Promise.all([
          apiClient.getMarketSnapshots(TRACKED_ASSETS),
          apiClient.getHistoricalData(selectedAsset, timeframe)
        ]);

        const predictionData = await apiClient.getPrediction(selectedAsset, timeframe, historicalData);

        if (!isMounted) {
          return;
        }

        setMarkets(marketData);
        setHistory(historicalData);
        setPrediction(predictionData);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
        }
      } finally {
        if (showLoadingState && isMounted) {
          setLoading(false);
        }
      }
    }

    void loadData(true);

    const refreshTimer = window.setInterval(() => {
      void loadData(false);
    }, 60_000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [selectedAsset, timeframe]);

  useEffect(() => {
    const streams = TRACKED_ASSETS.map((asset) => `${WS_STREAM_SYMBOL[asset]}@miniTicker`).join('/');
    const socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { data?: { s?: string; c?: string; P?: string } };
        const update = payload.data;
        if (!update?.s || !update.c || !update.P) {
          return;
        }

        const symbol = update.s.replace('USDT', '') as AssetSymbol;
        const nextPrice = Number(update.c);
        const nextChangePct = Number(update.P);

        if (!Number.isFinite(nextPrice) || !Number.isFinite(nextChangePct)) {
          return;
        }

        setMarkets((currentMarkets) => {
          if (currentMarkets.length === 0) return currentMarkets;

          return currentMarkets.map((market) =>
            market.symbol === symbol
              ? {
                  ...market,
                  priceUsd: nextPrice,
                  change24hPct: nextChangePct
                }
              : market
          );
        });

        if (symbol === selectedAsset) {
          setHistory((currentHistory) => {
            if (currentHistory.length === 0) return currentHistory;

            const nextHistory = [...currentHistory];
            const last = nextHistory[nextHistory.length - 1];
            nextHistory[nextHistory.length - 1] = {
              ...last,
              close: nextPrice,
              high: Math.max(last.high, nextPrice),
              low: Math.min(last.low, nextPrice)
            };

            return nextHistory;
          });
        }
      } catch {
        // Ignore malformed stream payloads.
      }
    };

    return () => {
      socket.close();
    };
  }, [selectedAsset]);

  const selectedMarket = useMemo(() => markets.find((market) => market.symbol === selectedAsset), [markets, selectedAsset]);

  const sparklineData = useMemo(
    () => history.map((item) => ({ v: item.close })),
    [history]
  );

  const latestPrice = history.at(-1)?.close ?? selectedMarket?.priceUsd ?? 0;
  const firstPrice = history[0]?.close ?? latestPrice;
  const timeframeDeltaPct = firstPrice === 0 ? 0 : ((latestPrice - firstPrice) / firstPrice) * 100;
  const highValue = history.reduce((max, item) => Math.max(max, item.high), 0);
  const lowValue = history.reduce((min, item) => Math.min(min, item.low), Number.POSITIVE_INFINITY);

  return (
    <main className="dashboard">
      <nav className="top-nav">
        <div>
          <div className="brand">Predictify</div>
          <p className="brand-subtitle">Live trade signals and market pulse.</p>
        </div>
        <div className="top-nav__controls">
          <p className="top-nav__caption">Asset</p>
          <AssetSelector assets={TRACKED_ASSETS} selectedAsset={selectedAsset} onSelect={setSelectedAsset} />
        </div>
      </nav>

      {error && <div className="status status--error">{error}</div>}
      {loading && <div className="status">Syncing live market feeds…</div>}

      {!loading && !error && (
        <>
          <section className="hero-panel panel">
            <div>
              <p className="label">Now Tracking</p>
              <h1>{selectedMarket?.name ?? selectedAsset}</h1>
              <p className="hero-price">{currencyFormatter.format(latestPrice)}</p>
              <p className={`hero-delta ${timeframeDeltaPct >= 0 ? 'up' : 'down'}`}>
                {timeframeDeltaPct >= 0 ? '+' : ''}
                {timeframeDeltaPct.toFixed(2)}% • {performanceLabel(timeframeDeltaPct)}
              </p>
            </div>
            <div className="hero-metrics">
              <div>
                <p className="label">Timeframe High</p>
                <p className="value">{currencyFormatter.format(highValue)}</p>
              </div>
              <div>
                <p className="label">Timeframe Low</p>
                <p className="value">{currencyFormatter.format(Number.isFinite(lowValue) ? lowValue : 0)}</p>
              </div>
              <div>
                <p className="label">24h Volume</p>
                <p className="value">{currencyFormatter.format(selectedMarket?.volume24hUsd ?? 0)}</p>
              </div>
              <div className="sparkline-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
                    <Area type="monotone" dataKey="v" stroke="#7f8bff" fill="url(#sparkGradient)" strokeWidth={2} />
                    <defs>
                      <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7f8bff" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#7f8bff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="market-grid">
            {markets.map((market) => (
              <MarketCard key={market.symbol} market={market} />
            ))}
          </section>

          <section className="content-grid">
            <div>
              <div className="panel__header panel__header--inline">
                <h2>{selectedMarket?.name ?? selectedAsset} chartroom</h2>
                <div className="chart-toolbar">
                  <TimeframeControls timeframe={timeframe} onChange={setTimeframe} />
                  <div className="mode-toggle">
                    <button className={`chip chip--small ${chartMode === 'line' ? 'chip--active' : ''}`} onClick={() => setChartMode('line')}>
                      Line
                    </button>
                    <button className={`chip chip--small ${chartMode === 'candlestick' ? 'chip--active' : ''}`} onClick={() => setChartMode('candlestick')}>
                      Range
                    </button>
                  </div>
                </div>
              </div>
              <PriceChart data={history} mode={chartMode} timeframe={timeframe} />
            </div>
            {prediction && <PredictionPanel prediction={prediction} />}
          </section>
        </>
      )}
    </main>
  );
}
