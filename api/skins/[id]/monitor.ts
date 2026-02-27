import type { VercelRequest, VercelResponse } from '@vercel/node';
import { removeMonitoredSkin } from '../../_lib/marketData';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const id = req.query.id as string;
  await removeMonitoredSkin(id);
  res.json({ message: 'Removed from monitoring' });
}
