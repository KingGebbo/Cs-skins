import React from 'react';

interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function PumpScoreBadge({ score, size = 'md' }: Props): React.ReactElement {
  const color =
    score >= 70 ? 'bg-pump-high text-white' :
    score >= 40 ? 'bg-pump-mid text-black' :
    'bg-pump-low text-black';

  const sizeClass =
    size === 'lg' ? 'text-2xl font-bold px-4 py-2 rounded-xl' :
    size === 'sm' ? 'text-xs font-semibold px-2 py-0.5 rounded' :
    'text-sm font-bold px-3 py-1 rounded-lg';

  return (
    <span className={`inline-block ${color} ${sizeClass} tabular-nums`}>
      {score.toFixed(1)}
    </span>
  );
}

export function pumpColor(score: number): string {
  if (score >= 70) return '#f85149';
  if (score >= 40) return '#d29922';
  return '#3fb950';
}

export function pumpLabel(score: number): string {
  if (score >= 70) return 'HIGH RISK';
  if (score >= 40) return 'WATCH';
  return 'LOW';
}
