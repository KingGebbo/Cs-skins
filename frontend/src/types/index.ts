export interface SkinScore {
  skin_id: string;
  name: string;
  weapon_type: string;
  exterior: string;
  image_url: string;
  pump_probability: number;
  divergence_score: number;
  clustering_score: number;
  timestamp: number;
  latest_price: number;
}

export interface SkinDetail {
  skin: {
    id: string;
    name: string;
    weapon_type: string;
    exterior: string;
    image_url: string;
  };
  latestScore: {
    divergence_score: number;
    clustering_score: number;
    pump_probability: number;
    western_volume_growth: number;
    eastern_volume_growth: number;
    top_buyer_concentration: number;
    unique_buyers: number;
    timestamp: number;
  } | null;
  snapshots: PriceSnapshot[];
  scoreHistory: ScoreHistory[];
  transactions: Transaction[];
}

export interface PriceSnapshot {
  timestamp: number;
  csfloat_price: number;
  csfloat_volume: number;
  eastern_price: number;
  eastern_volume: number;
}

export interface ScoreHistory {
  timestamp: number;
  divergence_score: number;
  clustering_score: number;
  pump_probability: number;
}

export interface Transaction {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  price: number;
  timestamp: number;
}

export interface AnalysisStats {
  totalSkins: number;
  totalSnapshots: number;
  totalTransactions: number;
  alertsToday: number;
  lastRunAt: string | null;
}

export type TimeWindow = '7d' | '14d' | '30d';
export type ScoreFilter = 'all' | 'high' | 'medium' | 'low';

export interface Filters {
  scoreThreshold: number;
  weaponType: string;
  minPrice: number;
  maxPrice: number;
  timeWindow: TimeWindow;
}
