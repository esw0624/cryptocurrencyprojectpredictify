import type { Timeframe } from '../lib/apiClient';

interface TimeframeControlsProps {
  timeframe: Timeframe;
  onChange: (value: Timeframe) => void;
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y'];

export function TimeframeControls({ timeframe, onChange }: TimeframeControlsProps) {
  return (
    <div className="timeframe-controls" role="tablist" aria-label="Timeframe">
      {TIMEFRAMES.map((item) => (
        <button
          key={item}
          role="tab"
          aria-selected={timeframe === item}
          className={`chip chip--small ${timeframe === item ? 'chip--active' : ''}`}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
