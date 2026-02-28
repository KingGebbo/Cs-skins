import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDb } from './_lib/db';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await ensureDb();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
}
