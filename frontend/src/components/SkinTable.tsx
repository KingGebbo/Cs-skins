import React from 'react';
import { ChevronRight, TrendingUp } from 'lucide-react';
import type { SkinScore } from '../types';
import { PumpScoreBadge, pumpColor, pumpLabel } from './PumpScoreBadge';

interface Props {
  skins: SkinScore[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export function SkinTable({ skins, onSelect, selectedId }: Props): React.ReactElement {
  if (skins.length === 0) {
    return (
      <div className="bg-cs-surface border border-cs-border rounded-xl p-12 text-center text-cs-muted">
        <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No skins match current filters.</p>
        <p className="text-xs mt-1">Add skins to monitor or adjust filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-cs-surface border border-cs-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cs-border text-cs-muted text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Skin</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-center">Divergence</th>
            <th className="px-4 py-3 text-center">Clustering</th>
            <th className="px-4 py-3 text-center">Pump Score</th>
            <th className="px-4 py-3 text-center">Risk</th>
            <th className="px-4 py-3 text-right">Updated</th>
            <th className="px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {skins.map((skin, i) => {
            const isSelected = skin.skin_id === selectedId;
            const rowBg =
              skin.pump_probability >= 70
                ? 'bg-pump-high/5 hover:bg-pump-high/10'
                : skin.pump_probability >= 40
                ? 'bg-pump-mid/5 hover:bg-pump-mid/10'
                : 'hover:bg-white/5';

            return (
              <tr
                key={skin.skin_id}
                onClick={() => onSelect(skin.skin_id)}
                className={`border-b border-cs-border/50 cursor-pointer transition-colors ${rowBg} ${
                  isSelected ? 'ring-1 ring-inset ring-cs-accent' : ''
                }`}
              >
                <td className="px-4 py-3 text-cs-text font-medium max-w-[200px] truncate">
                  {skin.name}
                </td>
                <td className="px-4 py-3 text-cs-muted">{skin.weapon_type || '—'}</td>
                <td className="px-4 py-3 text-right text-cs-text tabular-nums">
                  {skin.latest_price ? `$${skin.latest_price.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreBar value={skin.divergence_score} />
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreBar value={skin.clustering_score} />
                </td>
                <td className="px-4 py-3 text-center">
                  <PumpScoreBadge score={skin.pump_probability} size="sm" />
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className="text-xs font-bold"
                    style={{ color: pumpColor(skin.pump_probability) }}
                  >
                    {pumpLabel(skin.pump_probability)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-cs-muted text-xs tabular-nums">
                  {skin.timestamp
                    ? new Date(skin.timestamp * 1000).toLocaleTimeString()
                    : '—'}
                </td>
                <td className="px-2 py-3 text-cs-muted">
                  <ChevronRight size={16} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ScoreBar({ value }: { value: number }): React.ReactElement {
  const color = value >= 70 ? '#f85149' : value >= 40 ? '#d29922' : '#3fb950';
  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="w-16 h-1.5 bg-cs-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-cs-muted tabular-nums w-8">{value.toFixed(0)}</span>
    </div>
  );
}
