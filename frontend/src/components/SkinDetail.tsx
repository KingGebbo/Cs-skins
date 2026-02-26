import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { X, RefreshCw, Loader } from 'lucide-react';
import type { SkinDetail as SkinDetailType } from '../types';
import { fetchSkinDetail, triggerAnalysis } from '../api/client';
import { PumpScoreBadge } from './PumpScoreBadge';

interface Props {
  skinId: string;
  onClose: () => void;
}

export function SkinDetail({ skinId, onClose }: Props): React.ReactElement {
  const [detail, setDetail] = useState<SkinDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchSkinDetail(skinId);
      setDetail(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      await triggerAnalysis(skinId);
      await load();
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => { load(); }, [skinId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-cs-muted" size={28} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-cs-muted text-center p-8">Failed to load skin details.</div>
    );
  }

  const { skin, latestScore, snapshots, scoreHistory } = detail;

  // Build buyer distribution data for pie chart
  const buyerData = latestScore
    ? (() => {
        const db = detail.transactions;
        const counts = new Map<string, number>();
        for (const tx of db) {
          const key = tx.buyer_id ?? 'Unknown';
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([id, count]) => ({
            name: id === 'Unknown' ? 'Unknown' : id.slice(0, 8) + '…',
            value: count,
          }));
      })()
    : [];

  const PIE_COLORS = ['#f85149', '#d29922', '#3fb950', '#58a6ff', '#bc8cff', '#79c0ff', '#ff7b72', '#ffa657'];

  // Price chart data
  const priceData = snapshots.map(s => ({
    time: new Date(s.timestamp * 1000).toLocaleDateString(),
    'CSFloat': Number(s.csfloat_price.toFixed(2)),
    'Eastern': Number(s.eastern_price.toFixed(2)),
  }));

  // Volume comparison data
  const volumeData = snapshots.map(s => ({
    time: new Date(s.timestamp * 1000).toLocaleDateString(),
    'Western Vol': s.csfloat_volume,
    'Eastern Vol': s.eastern_volume,
  }));

  // Score history data
  const scoreData = scoreHistory.map(s => ({
    time: new Date(s.timestamp * 1000).toLocaleDateString(),
    'Pump Score': Number(s.pump_probability.toFixed(1)),
    'Divergence': Number(s.divergence_score.toFixed(1)),
    'Clustering': Number(s.clustering_score.toFixed(1)),
  }));

  return (
    <div className="bg-cs-surface border border-cs-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-cs-border">
        <div>
          <h2 className="text-cs-text font-bold text-lg">{skin.name}</h2>
          <p className="text-cs-muted text-sm">{skin.weapon_type} · {skin.exterior}</p>
        </div>
        <div className="flex items-center gap-3">
          {latestScore && (
            <PumpScoreBadge score={latestScore.pump_probability} size="lg" />
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1.5 bg-cs-dark border border-cs-border rounded-lg px-3 py-2 text-sm text-cs-text hover:border-cs-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={analyzing ? 'animate-spin' : ''} />
            Analyze
          </button>
          <button
            onClick={onClose}
            className="text-cs-muted hover:text-cs-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Score cards */}
      {latestScore && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 border-b border-cs-border">
          <ScoreCard label="Pump Probability" value={latestScore.pump_probability} />
          <ScoreCard label="Divergence Score" value={latestScore.divergence_score} />
          <ScoreCard label="Clustering Score" value={latestScore.clustering_score} />
          <div className="bg-cs-dark rounded-xl p-3">
            <p className="text-xs text-cs-muted mb-1">Unique Buyers (30d)</p>
            <p className="text-2xl font-bold text-cs-text">{latestScore.unique_buyers}</p>
            <p className="text-xs text-cs-muted mt-1">
              Top: {latestScore.top_buyer_concentration?.toFixed(1) ?? '—'}%
            </p>
          </div>
        </div>
      )}

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price chart */}
        {priceData.length > 0 && (
          <ChartCard title="Price History (CSFloat vs Eastern)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="time" tick={{ fill: '#8b949e', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="CSFloat" stroke="#58a6ff" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Eastern" stroke="#f78166" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Volume comparison */}
        {volumeData.length > 0 && (
          <ChartCard title="East vs West Volume % Comparison">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="time" tick={{ fill: '#8b949e', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="Western Vol" fill="#3fb950" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Eastern Vol" fill="#f85149" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Pump score history */}
        {scoreData.length > 0 && (
          <ChartCard title="Pump Probability History">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="time" tick={{ fill: '#8b949e', fontSize: 11 }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#8b949e', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="Pump Score" stroke="#f85149" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Divergence" stroke="#d29922" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="Clustering" stroke="#bc8cff" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Buyer distribution pie */}
        {buyerData.length > 0 && (
          <ChartCard title="Buyer Distribution (Top 8)">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={buyerData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {buyerData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }): React.ReactElement {
  const color =
    value >= 70 ? 'text-pump-high' : value >= 40 ? 'text-pump-mid' : 'text-pump-low';
  return (
    <div className="bg-cs-dark rounded-xl p-3">
      <p className="text-xs text-cs-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value.toFixed(1)}</p>
      <div className="mt-2 h-1.5 bg-cs-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            backgroundColor: value >= 70 ? '#f85149' : value >= 40 ? '#d29922' : '#3fb950',
          }}
        />
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="bg-cs-dark rounded-xl p-4">
      <h3 className="text-cs-muted text-xs font-semibold uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}
