import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLatestScores } from '../_lib/pumpDetection';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const threshold = parseFloat((req.query.threshold as string) ?? '70');
  try {
    const all = await getLatestScores();
    const alerts = all.filter((s: { pump_probability: number }) => s.pump_probability >= threshold);
    res.json({ data: alerts, count: alerts.length, threshold });
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
}
