import { type FormEvent, useState } from 'react';
import type { DatePredictionResponse, PredictionResponse } from '../lib/apiClient';

interface PredictionPanelProps {
  prediction: PredictionResponse;
  datePrediction: DatePredictionResponse | null;
  selectedAsset: string;
  onPredictByDate: (targetDateIso: string) => Promise<void>;
}

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function defaultTargetDateTime() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function PredictionPanel({ prediction, datePrediction, selectedAsset, onPredictByDate }: PredictionPanelProps) {
  const [targetDate, setTargetDate] = useState(defaultTargetDateTime());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const iso = new Date(targetDate).toISOString();
      await onPredictByDate(iso);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to generate prediction.');
    } finally {
      setLoading(false);
    }
  }

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

      <form onSubmit={handleSubmit} className="date-prediction-form">
        <p className="label">Predict by future date ({selectedAsset})</p>
        <input
          type="datetime-local"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          required
        />
        <button type="submit" className="chip chip--small chip--active" disabled={loading}>
          {loading ? 'Predicting…' : 'Generate estimate'}
        </button>
      </form>

      {error && <p className="status status--error">{error}</p>}

      {datePrediction && (
        <div className="prediction-table-wrap">
          <p className="label">Date prediction result</p>
          <table className="prediction-table">
            <thead>
              <tr>
                <th>Target Date</th>
                <th>Current</th>
                <th>Predicted</th>
                <th>Range</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{new Date(datePrediction.targetDateIso).toLocaleString()}</td>
                <td>{formatter.format(datePrediction.currentPriceUsd)}</td>
                <td>{formatter.format(datePrediction.predictedPriceUsd)}</td>
                <td>
                  {formatter.format(datePrediction.lowEstimateUsd)} - {formatter.format(datePrediction.highEstimateUsd)}
                </td>
                <td>{datePrediction.confidencePct.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </aside>
  );
}
