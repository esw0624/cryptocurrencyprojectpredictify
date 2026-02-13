import type { PredictionResponse } from '../lib/apiClient';

interface PredictionPanelProps {
  prediction: PredictionResponse;
}

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

export function PredictionPanel({ prediction }: PredictionPanelProps) {
  return (
    <aside className="panel prediction-panel">
      <div className="panel__header">
        <h3>Prediction</h3>
        <span className={`pill pill--${prediction.direction}`}>{prediction.direction}</span>
      </div>
      <div className="prediction-grid">
        <div>
          <p className="label">Next Horizon</p>
          <p className="value">{prediction.horizon}</p>
        </div>
        <div>
          <p className="label">Forecast Price</p>
          <p className="value">{formatter.format(prediction.predictedPriceUsd)}</p>
        </div>
        <div>
          <p className="label">Confidence</p>
          <p className="value">{prediction.confidencePct.toFixed(1)}%</p>
        </div>
        <div>
          <p className="label">Last Model Run</p>
          <p className="value">{new Date(prediction.lastModelRun).toLocaleString()}</p>
        </div>
      </div>
    </aside>
  );
}
