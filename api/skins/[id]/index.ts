import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from '../../_lib/db';
import { getSnapshots, getRecentTransactions } from '../../_lib/marketData';
import { getPumpScoreHistory } from '../../_lib/pumpDetection';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const id = req.query.id as string;
  await ensureDb();

  const { rows: skinRows } = await sql`SELECT * FROM skins WHERE id = ${id}`;
  if (skinRows.length === 0) return res.status(404).json({ error: 'Skin not found' });

  const { rows: scoreRows } = await sql`
    SELECT * FROM pump_scores WHERE skin_id = ${id} ORDER BY timestamp DESC LIMIT 1
  `;

  const [snapshots, scoreHistory, transactions] = await Promise.all([
    getSnapshots(id, 30),
    getPumpScoreHistory(id, 30),
    getRecentTransactions(id, 30),
  ]);

  res.json({
    skin: skinRows[0],
    latestScore: scoreRows[0] ?? null,
    snapshots,
    scoreHistory,
    transactions,
  });
}
