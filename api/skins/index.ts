import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLatestScores } from '../_lib/pumpDetection';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const scores = await getLatestScores();
    res.json({ data: scores, lastUpdated: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch skins' });
  }
}
