import type { AssetSymbol } from '../lib/apiClient';

interface AssetSelectorProps {
  assets: AssetSymbol[];
  selectedAsset: AssetSymbol;
  onSelect: (asset: AssetSymbol) => void;
}

export function AssetSelector({ assets, selectedAsset, onSelect }: AssetSelectorProps) {
  return (
    <div className="asset-selector" role="tablist" aria-label="Assets">
      {assets.map((asset) => (
        <button
          key={asset}
          role="tab"
          aria-selected={selectedAsset === asset}
          className={`chip ${selectedAsset === asset ? 'chip--active' : ''}`}
          onClick={() => onSelect(asset)}
        >
          {asset}
        </button>
      ))}
    </div>
  );
}
