import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchSkins } from '../_lib/csfloat';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = (req.query.q as string) ?? '';
  if (!q.trim()) return res.json({ data: [] });

  try {
    const listings = await searchSkins(q);
    const unique = [
      ...new Map(listings.map(l => [l.item.market_hash_name, l])).values(),
    ];
    res.json({
      data: unique.map(l => ({ name: l.item.market_hash_name, imageUrl: l.item.icon_url })),
    });
  } catch {
    res.status(500).json({ error: 'Search failed' });
  }
}
