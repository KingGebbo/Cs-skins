import React, { useState } from 'react';
import { X, Plus, Search, Loader } from 'lucide-react';
import { addSkinToMonitor, searchSkins } from '../api/client';

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export function AddSkinModal({ onClose, onAdded }: Props): React.ReactElement {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ name: string; imageUrl: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchSkins(query.trim());
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(name: string) {
    setAdding(name);
    try {
      await addSkinToMonitor(name);
      onAdded();
      onClose();
    } finally {
      setAdding(null);
    }
  }

  const POPULAR_SKINS = [
    'AK-47 | Redline (Field-Tested)',
    'AWP | Dragon Lore (Factory New)',
    'M4A4 | Howl (Factory New)',
    'Karambit | Fade (Factory New)',
    'AK-47 | Fire Serpent (Field-Tested)',
    'AWP | Asiimov (Field-Tested)',
    'M4A1-S | Hyper Beast (Factory New)',
    'Glock-18 | Fade (Factory New)',
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-cs-surface border border-cs-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-cs-border">
          <h2 className="text-cs-text font-bold text-lg">Add Skin to Monitor</h2>
          <button onClick={onClose} className="text-cs-muted hover:text-cs-text transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-xs text-cs-muted mb-2">Search CSFloat</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="AK-47 | Redline..."
                className="flex-1 bg-cs-dark border border-cs-border rounded-lg px-3 py-2 text-cs-text text-sm focus:outline-none focus:border-cs-accent"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-cs-accent text-white px-3 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>
          </div>

          {/* Search results */}
          {results.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {results.map(r => (
                <div
                  key={r.name}
                  className="flex items-center justify-between bg-cs-dark rounded-lg px-3 py-2"
                >
                  <span className="text-cs-text text-sm truncate">{r.name}</span>
                  <button
                    onClick={() => handleAdd(r.name)}
                    disabled={adding === r.name}
                    className="text-cs-accent hover:opacity-80 ml-2 flex-shrink-0 disabled:opacity-50"
                  >
                    {adding === r.name ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Custom name */}
          <div>
            <label className="block text-xs text-cs-muted mb-2">Or enter exact market hash name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Exact market name..."
                className="flex-1 bg-cs-dark border border-cs-border rounded-lg px-3 py-2 text-cs-text text-sm focus:outline-none focus:border-cs-accent"
              />
              <button
                onClick={() => handleAdd(customName)}
                disabled={!customName.trim() || adding === customName}
                className="bg-cs-dark border border-cs-border text-cs-text px-3 py-2 rounded-lg hover:border-cs-accent transition-colors disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Popular skins */}
          <div>
            <label className="block text-xs text-cs-muted mb-2">Popular Skins</label>
            <div className="grid grid-cols-2 gap-1.5">
              {POPULAR_SKINS.map(name => (
                <button
                  key={name}
                  onClick={() => handleAdd(name)}
                  disabled={adding === name}
                  className="text-left text-xs bg-cs-dark border border-cs-border rounded-lg px-2 py-1.5 text-cs-muted hover:text-cs-text hover:border-cs-accent transition-colors disabled:opacity-50 truncate"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
