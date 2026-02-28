import type { VercelRequest, VercelResponse } from '@vercel/node';
import { upsertSkin, addMonitoredSkin, refreshSkinData } from '../_lib/marketData';
import { runFullAnalysis } from '../_lib/pumpDetection';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name } = req.body as { name?: string };
  if (!name) return res.status(400).json({ error: 'name required' });

  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  await upsertSkin({
    id,
    name,
    weaponType: name.split(' | ')[0] ?? 'Unknown',
    exterior: name.split('(')[1]?.replace(')', '') ?? 'Unknown',
    imageUrl: '',
  });
  await addMonitoredSkin(id);

  // Kick off data fetch async (no await so response is immediate)
  refreshSkinData(id, name)
    .then(() => runFullAnalysis(id))
    .catch(console.error);

  res.json({ message: `Now monitoring: ${name}`, id });
}
