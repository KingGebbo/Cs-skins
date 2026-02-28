import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPumpScoreHistory } from '../../_lib/pumpDetection';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;
  const days = parseInt((req.query.days as string) ?? '30', 10);
  const history = await getPumpScoreHistory(id, days);
  res.json({ data: history });
}
