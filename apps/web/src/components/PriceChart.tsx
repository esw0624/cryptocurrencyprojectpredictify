import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { HistoricalCandle, Timeframe } from '../lib/apiClient';

interface PriceChartProps {
  data: HistoricalCandle[];
  mode: 'line' | 'candlestick';
  timeframe: Timeframe;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

function formatAxisLabel(timestamp: string, timeframe: Timeframe) {
  const date = new Date(timestamp);

  if (timeframe === '1D') {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  if (timeframe === '1W' || timeframe === '1M') {
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' });
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTooltipLabel(timestamp: string) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function PriceChart({ data, mode, timeframe }: PriceChartProps) {
  const points = data.map((item) => ({
    timestamp: item.timestamp,
    axisLabel: formatAxisLabel(item.timestamp, timeframe),
    close: item.close,
    high: item.high,
    low: item.low
  }));

  const latest = points.at(-1)?.close ?? 0;

  return (
    <section className="panel chart-panel">
      <div className="panel__header chart-panel__header">
        <h3>Price Chart</h3>
        <span className="timeline-pill">Timeline: date + time</span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'line' ? (
            <LineChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#2c3344" />
              <XAxis dataKey="axisLabel" tick={{ fill: '#97a3b8', fontSize: 11 }} minTickGap={24} />
              <YAxis tick={{ fill: '#97a3b8', fontSize: 12 }} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} width={82} />
              <Tooltip
                labelFormatter={(_, payload) => {
                  const stamp = payload?.[0]?.payload?.timestamp as string | undefined;
                  return stamp ? formatTooltipLabel(stamp) : '';
                }}
                formatter={(value) => currencyFormatter.format(Number(value))}
                contentStyle={{ background: '#0f1a2e', border: '1px solid #2e426a', borderRadius: '10px' }}
              />
              <ReferenceLine y={latest} stroke="#5a6d94" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="close" stroke="#f5a524" strokeWidth={2.4} dot={false} />
            </LineChart>
          ) : (
            <AreaChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#2c3344" />
              <XAxis dataKey="axisLabel" tick={{ fill: '#97a3b8', fontSize: 11 }} minTickGap={24} />
              <YAxis tick={{ fill: '#97a3b8', fontSize: 12 }} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} width={82} />
              <Tooltip
                labelFormatter={(_, payload) => {
                  const stamp = payload?.[0]?.payload?.timestamp as string | undefined;
                  return stamp ? formatTooltipLabel(stamp) : '';
                }}
                formatter={(value) => currencyFormatter.format(Number(value))}
                contentStyle={{ background: '#0f1a2e', border: '1px solid #2e426a', borderRadius: '10px' }}
              />
              <Area type="monotone" dataKey="high" stroke="#14d8b3" fill="#14d8b326" strokeWidth={2} />
              <Area type="monotone" dataKey="low" stroke="#ff6d8a" fill="#ff6d8a24" strokeWidth={2} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
