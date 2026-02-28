import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runAnalysisPipeline } from '../analysis/run';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify Vercel Cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const count = await runAnalysisPipeline();
    res.json({ message: `Pipeline complete. Processed ${count} skins.` });
  } catch (err) {
    res.status(500).json({ error: 'Pipeline failed', detail: String(err) });
  }
}
