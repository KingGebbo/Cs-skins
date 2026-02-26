import React from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import type { SkinScore } from '../types';
import { PumpScoreBadge } from './PumpScoreBadge';

interface Props {
  alerts: SkinScore[];
  onSelectSkin: (id: string) => void;
}

export function AlertPanel({ alerts, onSelectSkin }: Props): React.ReactElement {
  if (alerts.length === 0) {
    return (
      <div className="bg-cs-surface border border-cs-border rounded-xl p-4 flex items-center gap-3 text-cs-muted">
        <TrendingUp size={18} />
        <span className="text-sm">No active alerts — all monitored skins below threshold.</span>
      </div>
    );
  }

  return (
    <div className="bg-pump-high/10 border border-pump-high/40 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={18} className="text-pump-high animate-pulse" />
        <h2 className="text-pump-high font-bold text-sm uppercase tracking-wider">
          Pump Alerts ({alerts.length})
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {alerts.map(skin => (
          <button
            key={skin.skin_id}
            onClick={() => onSelectSkin(skin.skin_id)}
            className="flex items-center gap-2 bg-cs-surface border border-pump-high/30 rounded-lg px-3 py-2 hover:border-pump-high transition-colors"
          >
            <span className="text-cs-text text-sm font-medium">{skin.name}</span>
            <PumpScoreBadge score={skin.pump_probability} size="sm" />
          </button>
        ))}
      </div>
    </div>
  );
}
