import { sql, ensureDb } from './db';
import { getSnapshots, getRecentTransactions } from './marketData';

export interface DivergenceResult {
  score: number;
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
  score: number;
  uniqueBuyers: number;
  topBuyerCount: number;
  topBuyerConcentration: number;
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

export async function analyzeDivergence(skinId: string): Promise<DivergenceResult> {
  const [snapshots30d, snapshots14d, snapshots7d] = await Promise.all([
    getSnapshots(skinId, 30),
    getSnapshots(skinId, 14),
    getSnapshots(skinId, 7),
  ]);

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

  const weightedDiv = div7 * 0.5 + div14 * 0.3 + div30 * 0.2;
  const score = Math.min(100, Math.max(0, (weightedDiv / 200) * 100));

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

export async function analyzeClusterring(skinId: string): Promise<ClusteringResult> {
  const transactions = await getRecentTransactions(skinId, 30);

  if (transactions.length === 0) {
    return { score: 0, uniqueBuyers: 0, topBuyerCount: 0, topBuyerConcentration: 0, buyerDistribution: [] };
  }

  const buyerCounts = new Map<string, number>();
  let nullBuyers = 0;

  for (const tx of transactions) {
    if (!tx.buyer_id) { nullBuyers++; continue; }
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

  let clusterScore = 0;
  if (topBuyerCount >= 5 && topBuyerCount <= 17) {
    clusterScore += ((topBuyerCount - 4) / 13) * 40;
  } else if (topBuyerCount > 17) {
    clusterScore += 40;
  }
  if (topBuyerConcentration > 10) {
    clusterScore += Math.min(40, (topBuyerConcentration - 10) * 1.5);
  }
  const diversityRatio = uniqueBuyers / Math.max(1, transactions.length - nullBuyers);
  if (diversityRatio < 0.5) {
    clusterScore += (1 - diversityRatio * 2) * 20;
  }

  return {
    score: Math.min(100, clusterScore),
    uniqueBuyers,
    topBuyerCount,
    topBuyerConcentration,
    buyerDistribution: sortedBuyers.slice(0, 10),
  };
}

export function computePumpProbability(divergenceScore: number, clusteringScore: number): number {
  return Math.min(100, divergenceScore * 0.6 + clusteringScore * 0.4);
}

export async function runFullAnalysis(skinId: string): Promise<PumpAnalysisResult | null> {
  await ensureDb();

  const { rows } = await sql`
    SELECT csfloat_price, csfloat_volume
    FROM price_snapshots
    WHERE skin_id = ${skinId}
    ORDER BY timestamp DESC LIMIT 1
  `;
  if (rows.length === 0) return null;

  const latestSnapshot = rows[0] as { csfloat_price: number; csfloat_volume: number };

  const [divergenceDetail, clusteringDetail] = await Promise.all([
    analyzeDivergence(skinId),
    analyzeClusterring(skinId),
  ]);

  const pumpProbability = computePumpProbability(divergenceDetail.score, clusteringDetail.score);
  const timestamp = Math.floor(Date.now() / 1000);

  await sql`
    INSERT INTO pump_scores
      (skin_id, timestamp, divergence_score, clustering_score, pump_probability,
       western_volume_growth, eastern_volume_growth, top_buyer_concentration, unique_buyers)
    VALUES (
      ${skinId}, ${timestamp},
      ${divergenceDetail.score}, ${clusteringDetail.score}, ${pumpProbability},
      ${divergenceDetail.westernGrowth30d}, ${divergenceDetail.easternGrowth30d},
      ${clusteringDetail.topBuyerConcentration}, ${clusteringDetail.uniqueBuyers}
    )
  `;

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

export async function getPumpScoreHistory(skinId: string, days = 30) {
  await ensureDb();
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  const { rows } = await sql`
    SELECT timestamp, divergence_score, clustering_score, pump_probability
    FROM pump_scores
    WHERE skin_id = ${skinId} AND timestamp >= ${cutoff}
    ORDER BY timestamp ASC
  `;
  return rows;
}

export async function getLatestScores() {
  await ensureDb();
  const { rows } = await sql`
    WITH latest_scores AS (
      SELECT DISTINCT ON (skin_id)
        skin_id, divergence_score, clustering_score, pump_probability, timestamp
      FROM pump_scores
      ORDER BY skin_id, timestamp DESC
    ),
    latest_snapshots AS (
      SELECT DISTINCT ON (skin_id) skin_id, csfloat_price
      FROM price_snapshots
      ORDER BY skin_id, timestamp DESC
    )
    SELECT
      ls.skin_id, s.name, s.weapon_type, s.exterior, s.image_url,
      ls.pump_probability, ls.divergence_score, ls.clustering_score, ls.timestamp,
      COALESCE(lsnap.csfloat_price, 0) AS latest_price
    FROM latest_scores ls
    INNER JOIN skins s ON ls.skin_id = s.id
    INNER JOIN monitored_skins ms ON ls.skin_id = ms.skin_id
    LEFT JOIN latest_snapshots lsnap ON ls.skin_id = lsnap.skin_id
    WHERE ms.active = 1
    ORDER BY ls.pump_probability DESC
  `;
  return rows;
}
