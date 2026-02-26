import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { Filters, TimeWindow } from '../types';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  weaponTypes: string[];
}

export function FiltersPanel({ filters, onChange, weaponTypes }: Props): React.ReactElement {
  return (
    <div className="bg-cs-surface border border-cs-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal size={16} className="text-cs-muted" />
        <h3 className="text-cs-muted text-sm font-semibold uppercase tracking-wider">Filters</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Score threshold */}
        <div>
          <label className="block text-xs text-cs-muted mb-1">Min Score</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.scoreThreshold}
              onChange={e => onChange({ ...filters, scoreThreshold: Number(e.target.value) })}
              className="w-full accent-cs-accent"
            />
            <span className="text-cs-text text-sm w-8 text-right">{filters.scoreThreshold}</span>
          </div>
        </div>

        {/* Weapon type */}
        <div>
          <label className="block text-xs text-cs-muted mb-1">Weapon Type</label>
          <select
            value={filters.weaponType}
            onChange={e => onChange({ ...filters, weaponType: e.target.value })}
            className="w-full bg-cs-dark border border-cs-border rounded-lg px-2 py-1.5 text-cs-text text-sm focus:outline-none focus:border-cs-accent"
          >
            <option value="">All</option>
            {weaponTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Min price */}
        <div>
          <label className="block text-xs text-cs-muted mb-1">Min Price ($)</label>
          <input
            type="number"
            min={0}
            value={filters.minPrice || ''}
            placeholder="0"
            onChange={e => onChange({ ...filters, minPrice: Number(e.target.value) })}
            className="w-full bg-cs-dark border border-cs-border rounded-lg px-2 py-1.5 text-cs-text text-sm focus:outline-none focus:border-cs-accent"
          />
        </div>

        {/* Max price */}
        <div>
          <label className="block text-xs text-cs-muted mb-1">Max Price ($)</label>
          <input
            type="number"
            min={0}
            value={filters.maxPrice || ''}
            placeholder="∞"
            onChange={e => onChange({ ...filters, maxPrice: Number(e.target.value) })}
            className="w-full bg-cs-dark border border-cs-border rounded-lg px-2 py-1.5 text-cs-text text-sm focus:outline-none focus:border-cs-accent"
          />
        </div>

        {/* Time window */}
        <div>
          <label className="block text-xs text-cs-muted mb-1">Time Window</label>
          <div className="flex rounded-lg overflow-hidden border border-cs-border">
            {(['7d', '14d', '30d'] as TimeWindow[]).map(w => (
              <button
                key={w}
                onClick={() => onChange({ ...filters, timeWindow: w })}
                className={`flex-1 text-xs py-1.5 transition-colors ${
                  filters.timeWindow === w
                    ? 'bg-cs-accent text-white font-bold'
                    : 'bg-cs-dark text-cs-muted hover:text-cs-text'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
