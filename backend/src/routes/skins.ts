import { Router, Request, Response } from 'express';
import { getDb } from '../database/schema';
import {
  getAllMonitoredSkins,
  addMonitoredSkin,
  removeMonitoredSkin,
  getSnapshots,
  getRecentTransactions,
  upsertSkin,
} from '../services/marketData';
import { refreshSkinData } from '../services/marketData';
import { searchSkins } from '../services/csfloat';
import {
  runFullAnalysis,
  getPumpScoreHistory,
  getLatestScores,
} from '../services/pumpDetection';

const router = Router();

// GET /api/skins – list all monitored skins with latest pump scores
router.get('/', (_req: Request, res: Response) => {
  try {
    const scores = getLatestScores();
    res.json({ data: scores, lastUpdated: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch skins' });
  }
});

// GET /api/skins/search?q=AK-47
router.get('/search', async (req: Request, res: Response) => {
  const q = (req.query.q as string) ?? '';
  if (!q.trim()) return res.json({ data: [] });
  try {
    const listings = await searchSkins(q);
    const unique = [
      ...new Map(
        listings.map(l => [l.item.market_hash_name, l])
      ).values(),
    ];
    res.json({ data: unique.map(l => ({ name: l.item.market_hash_name, imageUrl: l.item.icon_url })) });
  } catch {
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/skins/:id – detail for one skin
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const skin = db.prepare('SELECT * FROM skins WHERE id = ?').get(id);
  if (!skin) return res.status(404).json({ error: 'Skin not found' });

  const latestScore = db
    .prepare(
      `SELECT * FROM pump_scores WHERE skin_id = ? ORDER BY timestamp DESC LIMIT 1`
    )
    .get(id);

  const snapshots = getSnapshots(id, 30);
  const scoreHistory = getPumpScoreHistory(id, 30);
  const transactions = getRecentTransactions(id, 30);

  res.json({ skin, latestScore, snapshots, scoreHistory, transactions });
});

// GET /api/skins/:id/analysis – run fresh analysis
router.post('/:id/analyze', async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const skin = db.prepare('SELECT * FROM skins WHERE id = ?').get(id) as { name: string } | undefined;
  if (!skin) return res.status(404).json({ error: 'Skin not found' });

  try {
    await refreshSkinData(id, skin.name);
    const result = await runFullAnalysis(id);
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// POST /api/skins/monitor – add skin to monitoring list
router.post('/monitor', async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name) return res.status(400).json({ error: 'name required' });

  // Generate a stable ID from name
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  await upsertSkin({
    id,
    name,
    weaponType: name.split(' | ')[0] ?? 'Unknown',
    exterior: name.split('(')[1]?.replace(')', '') ?? 'Unknown',
    imageUrl: '',
  });
  addMonitoredSkin(id);

  // Kick off initial data fetch
  refreshSkinData(id, name).then(() => runFullAnalysis(id)).catch(console.error);

  res.json({ message: `Now monitoring: ${name}`, id });
});

// DELETE /api/skins/:id/monitor – remove from monitoring
router.delete('/:id/monitor', (req: Request, res: Response) => {
  removeMonitoredSkin(req.params.id);
  res.json({ message: 'Removed from monitoring' });
});

// GET /api/skins/:id/price-history
router.get('/:id/price-history', (req: Request, res: Response) => {
  const days = parseInt((req.query.days as string) ?? '30', 10);
  const snapshots = getSnapshots(req.params.id, days);
  res.json({ data: snapshots });
});

// GET /api/skins/:id/score-history
router.get('/:id/score-history', (req: Request, res: Response) => {
  const days = parseInt((req.query.days as string) ?? '30', 10);
  const history = getPumpScoreHistory(req.params.id, days);
  res.json({ data: history });
});

export default router;
