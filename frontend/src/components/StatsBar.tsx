import React from 'react';
import { Database, Activity, AlertTriangle, Clock } from 'lucide-react';
import type { AnalysisStats } from '../types';

interface Props {
  stats: AnalysisStats | null;
  lastUpdated: string | null;
}

export function StatsBar({ stats, lastUpdated }: Props): React.ReactElement {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        icon={<Database size={16} />}
        label="Monitored Skins"
        value={stats?.totalSkins ?? '—'}
      />
      <StatCard
        icon={<Activity size={16} />}
        label="Snapshots Stored"
        value={stats?.totalSnapshots ?? '—'}
      />
      <StatCard
        icon={<AlertTriangle size={16} />}
        label="Alerts Today"
        value={stats?.alertsToday ?? '—'}
        highlight={!!stats && stats.alertsToday > 0}
      />
      <StatCard
        icon={<Clock size={16} />}
        label="Last Refreshed"
        value={
          lastUpdated
            ? new Date(lastUpdated).toLocaleTimeString()
            : stats?.lastRunAt
            ? new Date(stats.lastRunAt).toLocaleTimeString()
            : '—'
        }
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <div
      className={`bg-cs-surface border rounded-xl p-3 flex items-center gap-3 ${
        highlight ? 'border-pump-high/50' : 'border-cs-border'
      }`}
    >
      <span className={highlight ? 'text-pump-high' : 'text-cs-muted'}>{icon}</span>
      <div>
        <p className="text-xs text-cs-muted">{label}</p>
        <p className={`font-bold text-sm ${highlight ? 'text-pump-high' : 'text-cs-text'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
