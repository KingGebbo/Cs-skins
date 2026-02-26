import { Router, Request, Response } from 'express';
import { getDb } from '../database/schema';
import { runAnalysisPipeline } from '../cron/scheduler';
import { getLatestScores } from '../services/pumpDetection';

const router = Router();

// GET /api/analysis/alerts – skins with pump probability > threshold
router.get('/alerts', (req: Request, res: Response) => {
  const threshold = parseFloat((req.query.threshold as string) ?? '70');
  try {
    const all = getLatestScores();
    const alerts = all.filter(s => s.pump_probability >= threshold);
    res.json({ data: alerts, count: alerts.length, threshold });
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /api/analysis/run – manually trigger the pipeline
router.post('/run', async (_req: Request, res: Response) => {
  try {
    res.json({ message: 'Pipeline started' });
    // Run asynchronously
    runAnalysisPipeline().catch(console.error);
  } catch {
    res.status(500).json({ error: 'Failed to start pipeline' });
  }
});

// GET /api/analysis/webhook-log
router.get('/webhook-log', (req: Request, res: Response) => {
  const db = getDb();
  const limit = parseInt((req.query.limit as string) ?? '50', 10);
  const logs = db
    .prepare(
      `SELECT wl.*, s.name as skin_name
       FROM webhook_log wl
       LEFT JOIN skins s ON wl.skin_id = s.id
       ORDER BY wl.triggered_at DESC
       LIMIT ?`
    )
    .all(limit);
  res.json({ data: logs });
});

// GET /api/analysis/stats – overall system stats
router.get('/stats', (req: Request, res: Response) => {
  const db = getDb();

  const totalSkins = (db.prepare('SELECT COUNT(*) as c FROM monitored_skins WHERE active=1').get() as { c: number }).c;
  const totalSnapshots = (db.prepare('SELECT COUNT(*) as c FROM price_snapshots').get() as { c: number }).c;
  const totalTransactions = (db.prepare('SELECT COUNT(*) as c FROM transactions').get() as { c: number }).c;
  const alertsToday = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM pump_scores
         WHERE pump_probability >= 70
         AND timestamp >= strftime('%s','now','-1 day')`
      )
      .get() as { c: number }
  ).c;

  const lastRun = db
    .prepare(`SELECT MAX(timestamp) as t FROM pump_scores`)
    .get() as { t: number | null };

  res.json({
    totalSkins,
    totalSnapshots,
    totalTransactions,
    alertsToday,
    lastRunAt: lastRun.t ? new Date(lastRun.t * 1000).toISOString() : null,
  });
});

export default router;
