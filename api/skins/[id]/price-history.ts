import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSnapshots } from '../../_lib/marketData';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;
  const days = parseInt((req.query.days as string) ?? '30', 10);
  const snapshots = await getSnapshots(id, days);
  res.json({ data: snapshots });
}
