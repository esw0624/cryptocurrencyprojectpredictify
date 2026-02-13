import type { MarketSnapshot } from '../lib/apiClient';

interface MarketCardProps {
  market: MarketSnapshot;
}

const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function MarketCard({ market }: MarketCardProps) {
  const isPositive = market.change24hPct >= 0;

  return (
    <article className="market-card">
      <header>
        <h4>{market.symbol}</h4>
        <span>{market.name}</span>
      </header>
      <p className="market-card__price">{formatter.format(market.priceUsd)}</p>
      <p className={`market-card__delta ${isPositive ? 'up' : 'down'}`}>
        {isPositive ? '+' : ''}
        {market.change24hPct.toFixed(2)}%
      </p>
      <div className="market-card__meta">
        <small>Vol 24h: {formatter.format(market.volume24hUsd)}</small>
        <small>MCap: {formatter.format(market.marketCapUsd)}</small>
      </div>
    </article>
  );
}
