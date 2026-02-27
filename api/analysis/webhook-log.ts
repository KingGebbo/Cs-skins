import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDb();
  const limit = parseInt((req.query.limit as string) ?? '50', 10);

  const { rows } = await sql`
    SELECT wl.*, s.name AS skin_name
    FROM webhook_log wl
    LEFT JOIN skins s ON wl.skin_id = s.id
    ORDER BY wl.triggered_at DESC
    LIMIT ${limit}
  `;

  res.json({ data: rows });
}
