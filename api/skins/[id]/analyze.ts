import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from '../../_lib/db';
import { refreshSkinData } from '../../_lib/marketData';
import { runFullAnalysis } from '../../_lib/pumpDetection';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const id = req.query.id as string;
  await ensureDb();

  const { rows } = await sql`SELECT name FROM skins WHERE id = ${id}`;
  if (rows.length === 0) return res.status(404).json({ error: 'Skin not found' });

  try {
    await refreshSkinData(id, rows[0].name as string);
    const result = await runFullAnalysis(id);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed' });
  }
}
