import { getDb } from '../database/schema';
import { getSnapshots, getRecentTransactions } from './marketData';

export interface DivergenceResult {
  score: number; // 0–100
  westernGrowth7d: number;
  easternGrowth7d: number;
  westernGrowth14d: number;
  easternGrowth14d: number;
  westernGrowth30d: number;
  easternGrowth30d: number;
  divergence7d: number;
  divergence14d: number;
  divergence30d: number;
}

export interface ClusteringResult {
  score: number; // 0–100
  uniqueBuyers: number;
  topBuyerCount: number;
  topBuyerConcentration: number; // top buyer's % of all transactions
  buyerDistribution: Array<{ buyerId: string; count: number; percentage: number }>;
}

export interface PumpAnalysisResult {
  skinId: string;
  timestamp: number;
  divergenceScore: number;
  clusteringScore: number;
  pumpProbability: number;
  divergenceDetail: DivergenceResult;
  clusteringDetail: ClusteringResult;
  latestPrice: number;
  latestVolume: number;
}

/**
 * Stage 1: Volume Divergence Analysis
 * Compare % volume growth between Western and Eastern markets over multiple windows.
 * Flag when Eastern growth exceeds Western by >40%.
 */
export function analyzeDivergence(skinId: string): DivergenceResult {
  const snapshots30d = getSnapshots(skinId, 30);
  const snapshots14d = getSnapshots(skinId, 14);
  const snapshots7d = getSnapshots(skinId, 7);

  const calcGrowth = (
    snaps: typeof snapshots30d,
    field: 'csfloat_volume' | 'eastern_volume'
  ): number => {
    if (snaps.length < 2) return 0;
    const oldest = snaps[0][field] ?? 0;
    const newest = snaps[snaps.length - 1][field] ?? 0;
    if (oldest === 0) return newest > 0 ? 100 : 0;
    return ((newest - oldest) / oldest) * 100;
  };

  const wGrowth7 = calcGrowth(snapshots7d, 'csfloat_volume');
  const eGrowth7 = calcGrowth(snapshots7d, 'eastern_volume');
  const wGrowth14 = calcGrowth(snapshots14d, 'csfloat_volume');
  const eGrowth14 = calcGrowth(snapshots14d, 'eastern_volume');
  const wGrowth30 = calcGrowth(snapshots30d, 'csfloat_volume');
  const eGrowth30 = calcGrowth(snapshots30d, 'eastern_volume');

  const div7 = eGrowth7 - wGrowth7;
  const div14 = eGrowth14 - wGrowth14;
  const div30 = eGrowth30 - wGrowth30;

  // Score: weighted average of divergences clamped to 0–100
  // Weight recent windows more heavily
  const THRESHOLD = 40; // % divergence that triggers concern
  const weightedDiv = div7 * 0.5 + div14 * 0.3 + div30 * 0.2;

  // Normalize: 0 points at 0% divergence, 100 points at 200% divergence
  const rawScore = Math.max(0, (weightedDiv / 200) * 100);
  const score = Math.min(100, rawScore);

  return {
    score,
    westernGrowth7d: wGrowth7,
    easternGrowth7d: eGrowth7,
    westernGrowth14d: wGrowth14,
    easternGrowth14d: eGrowth14,
    westernGrowth30d: wGrowth30,
    easternGrowth30d: eGrowth30,
    divergence7d: div7,
    divergence14d: div14,
    divergence30d: div30,
  };
}

/**
 * Stage 2: Buyer Clustering Analysis
 * Suspicious pattern = single profile buying same skin 5–17× in short window.
 * Score increases with concentration of purchases from few buyers.
 */
export function analyzeClusterring(skinId: string): ClusteringResult {
  const transactions = getRecentTransactions(skinId, 30);

  if (transactions.length === 0) {
    return {
      score: 0,
      uniqueBuyers: 0,
      topBuyerCount: 0,
      topBuyerConcentration: 0,
      buyerDistribution: [],
    };
  }

  // Count purchases per buyer
  const buyerCounts = new Map<string, number>();
  let nullBuyers = 0;

  for (const tx of transactions) {
    if (!tx.buyer_id) {
      nullBuyers++;
      continue;
    }
    buyerCounts.set(tx.buyer_id, (buyerCounts.get(tx.buyer_id) ?? 0) + 1);
  }

  const sortedBuyers = [...buyerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([buyerId, count]) => ({
      buyerId,
      count,
      percentage: (count / transactions.length) * 100,
    }));

  const uniqueBuyers = sortedBuyers.length;
  const topBuyerCount = sortedBuyers[0]?.count ?? 0;
  const topBuyerConcentration = sortedBuyers[0]?.percentage ?? 0;

  // Scoring logic:
  // - Top buyer buying 5+ times in 30d is suspicious
  // - Concentration > 20% of all transactions by one buyer is very suspicious
  // - Few unique buyers relative to total transactions is suspicious
  let clusterScore = 0;

  // Component 1: Top buyer repeat count (5–17 range is suspicious)
  if (topBuyerCount >= 5 && topBuyerCount <= 17) {
    clusterScore += ((topBuyerCount - 4) / 13) * 40; // 0–40 pts
  } else if (topBuyerCount > 17) {
    clusterScore += 40;
  }

  // Component 2: Concentration
  if (topBuyerConcentration > 10) {
    clusterScore += Math.min(40, (topBuyerConcentration - 10) * 1.5); // 0–40 pts
  }

  // Component 3: Low buyer diversity
  const diversityRatio = uniqueBuyers / Math.max(1, transactions.length - nullBuyers);
  if (diversityRatio < 0.5) {
    clusterScore += (1 - diversityRatio * 2) * 20; // 0–20 pts
  }

  return {
    score: Math.min(100, clusterScore),
    uniqueBuyers,
    topBuyerCount,
    topBuyerConcentration,
    buyerDistribution: sortedBuyers.slice(0, 10),
  };
}

/**
 * Combined pump probability score.
 * Divergence weighted 60%, Clustering weighted 40%.
 */
export function computePumpProbability(
  divergenceScore: number,
  clusteringScore: number
): number {
  return Math.min(100, divergenceScore * 0.6 + clusteringScore * 0.4);
}

export async function runFullAnalysis(skinId: string): Promise<PumpAnalysisResult | null> {
  const db = getDb();

  const latestSnapshot = db
    .prepare(
      `SELECT csfloat_price, csfloat_volume, eastern_volume
       FROM price_snapshots
       WHERE skin_id = ?
       ORDER BY timestamp DESC LIMIT 1`
    )
    .get(skinId) as {
      csfloat_price: number;
      csfloat_volume: number;
      eastern_volume: number;
    } | undefined;

  if (!latestSnapshot) return null;

  const divergenceDetail = analyzeDivergence(skinId);
  const clusteringDetail = analyzeClusterring(skinId);
  const pumpProbability = computePumpProbability(
    divergenceDetail.score,
    clusteringDetail.score
  );

  const timestamp = Math.floor(Date.now() / 1000);

  // Persist score
  db.prepare(`
    INSERT INTO pump_scores
      (skin_id, timestamp, divergence_score, clustering_score, pump_probability,
       western_volume_growth, eastern_volume_growth, top_buyer_concentration, unique_buyers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    skinId,
    timestamp,
    divergenceDetail.score,
    clusteringDetail.score,
    pumpProbability,
    divergenceDetail.westernGrowth30d,
    divergenceDetail.easternGrowth30d,
    clusteringDetail.topBuyerConcentration,
    clusteringDetail.uniqueBuyers
  );

  return {
    skinId,
    timestamp,
    divergenceScore: divergenceDetail.score,
    clusteringScore: clusteringDetail.score,
    pumpProbability,
    divergenceDetail,
    clusteringDetail,
    latestPrice: latestSnapshot.csfloat_price,
    latestVolume: latestSnapshot.csfloat_volume,
  };
}

export function getPumpScoreHistory(
  skinId: string,
  days = 30
): Array<{
  timestamp: number;
  divergence_score: number;
  clustering_score: number;
  pump_probability: number;
}> {
  const db = getDb();
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  return db
    .prepare(
      `SELECT timestamp, divergence_score, clustering_score, pump_probability
       FROM pump_scores
       WHERE skin_id = ? AND timestamp >= ?
       ORDER BY timestamp ASC`
    )
    .all(skinId, cutoff) as ReturnType<typeof getPumpScoreHistory>;
}

export function getLatestScores(): Array<{
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
}> {
  const db = getDb();
  return db
    .prepare(
      `SELECT ps.skin_id, s.name, s.weapon_type, s.exterior, s.image_url,
              ps.pump_probability, ps.divergence_score, ps.clustering_score, ps.timestamp,
              snap.csfloat_price as latest_price
       FROM pump_scores ps
       INNER JOIN skins s ON ps.skin_id = s.id
       LEFT JOIN (
         SELECT skin_id, csfloat_price,
                ROW_NUMBER() OVER (PARTITION BY skin_id ORDER BY timestamp DESC) as rn
         FROM price_snapshots
       ) snap ON snap.skin_id = ps.skin_id AND snap.rn = 1
       WHERE ps.id IN (
         SELECT id FROM pump_scores
         WHERE skin_id = ps.skin_id
         ORDER BY timestamp DESC LIMIT 1
       )
       ORDER BY ps.pump_probability DESC`
    )
    .all() as ReturnType<typeof getLatestScores>;
}
