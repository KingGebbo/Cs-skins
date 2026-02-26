import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, RefreshCw, Loader, Wifi, WifiOff } from 'lucide-react';
import { fetchSkins, fetchAlerts, fetchStats, triggerFullPipeline, checkHealth } from './api/client';
import type { SkinScore, AnalysisStats, Filters } from './types';
import { AlertPanel } from './components/AlertPanel';
import { SkinTable } from './components/SkinTable';
import { SkinDetail } from './components/SkinDetail';
import { FiltersPanel } from './components/Filters';
import { StatsBar } from './components/StatsBar';
import { AddSkinModal } from './components/AddSkinModal';
import { useAutoRefresh } from './hooks/useAutoRefresh';

const AUTO_REFRESH_MS = 30 * 60 * 1000; // 30 minutes

const DEFAULT_FILTERS: Filters = {
  scoreThreshold: 0,
  weaponType: '',
  minPrice: 0,
  maxPrice: 0,
  timeWindow: '30d',
};

export default function App(): React.ReactElement {
  const [skins, setSkins] = useState<SkinScore[]>([]);
  const [alerts, setAlerts] = useState<SkinScore[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pipelining, setPipelining] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [skinsRes, alertsRes, statsRes] = await Promise.all([
        fetchSkins(),
        fetchAlerts(70),
        fetchStats(),
      ]);
      setSkins(skinsRes.data);
      setLastUpdated(skinsRes.lastUpdated);
      setAlerts(alertsRes.data);
      setStats(statsRes);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  // Auto-refresh every 30 minutes
  useAutoRefresh(loadAll, AUTO_REFRESH_MS);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const handleRunPipeline = useCallback(async () => {
    setPipelining(true);
    try {
      await triggerFullPipeline();
      setTimeout(loadAll, 3000); // reload after pipeline starts
    } finally {
      setPipelining(false);
    }
  }, [loadAll]);

  const weaponTypes = useMemo(
    () => [...new Set(skins.map(s => s.weapon_type).filter(Boolean))].sort(),
    [skins]
  );

  const filteredSkins = useMemo(() => {
    return skins.filter(s => {
      if (s.pump_probability < filters.scoreThreshold) return false;
      if (filters.weaponType && s.weapon_type !== filters.weaponType) return false;
      if (filters.minPrice && s.latest_price < filters.minPrice) return false;
      if (filters.maxPrice && filters.maxPrice > 0 && s.latest_price > filters.maxPrice) return false;
      return true;
    });
  }, [skins, filters]);

  return (
    <div className="min-h-screen bg-cs-dark text-cs-text">
      {/* Top nav */}
      <header className="border-b border-cs-border bg-cs-surface sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cs-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <div>
              <h1 className="text-cs-text font-bold text-base leading-tight">CS2 Pump Detector</h1>
              <p className="text-cs-muted text-xs">Market manipulation analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection status */}
            <span className={`flex items-center gap-1 text-xs ${isOnline ? 'text-pump-low' : 'text-pump-high'}`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'Live' : 'Offline'}
            </span>

            {/* Auto-refresh countdown hint */}
            <span className="text-cs-muted text-xs hidden sm:block">
              Auto-refresh: 30m
            </span>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 bg-cs-dark border border-cs-border rounded-lg px-3 py-1.5 text-sm text-cs-text hover:border-cs-accent transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              onClick={handleRunPipeline}
              disabled={pipelining}
              className="flex items-center gap-1.5 bg-cs-dark border border-cs-border rounded-lg px-3 py-1.5 text-sm text-cs-text hover:border-cs-accent transition-colors disabled:opacity-50"
            >
              {pipelining ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Run Pipeline
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-cs-accent text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
              Add Skin
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-cs-muted gap-4">
            <Loader size={36} className="animate-spin" />
            <p>Loading market data...</p>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <StatsBar stats={stats} lastUpdated={lastUpdated} />

            {/* Alert panel */}
            <AlertPanel alerts={alerts} onSelectSkin={setSelectedSkinId} />

            {/* Filters */}
            <FiltersPanel
              filters={filters}
              onChange={setFilters}
              weaponTypes={weaponTypes}
            />

            {/* Main content: table + detail */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className={selectedSkinId ? 'xl:col-span-1' : 'xl:col-span-3'}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-cs-text font-semibold">
                    Monitored Skins
                    <span className="text-cs-muted font-normal text-sm ml-2">
                      ({filteredSkins.length})
                    </span>
                  </h2>
                </div>
                <SkinTable
                  skins={filteredSkins}
                  onSelect={id => setSelectedSkinId(id === selectedSkinId ? null : id)}
                  selectedId={selectedSkinId}
                />
              </div>

              {selectedSkinId && (
                <div className="xl:col-span-2">
                  <SkinDetail
                    skinId={selectedSkinId}
                    onClose={() => setSelectedSkinId(null)}
                  />
                </div>
              )}
            </div>

            {skins.length === 0 && (
              <div className="text-center py-12 text-cs-muted">
                <p className="text-lg font-semibold mb-2">No skins monitored yet</p>
                <p className="text-sm mb-4">Click "Add Skin" to start tracking CS2 skin market activity.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-cs-accent text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Add Your First Skin
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {showAddModal && (
        <AddSkinModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); setTimeout(loadAll, 2000); }}
        />
      )}
    </div>
  );
}
