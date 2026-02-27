import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDb } from '../_lib/db';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  await ensureDb();
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

  const [
    { rows: [skinsRow] },
    { rows: [snapsRow] },
    { rows: [txRow] },
    { rows: [alertRow] },
    { rows: [lastRunRow] },
  ] = await Promise.all([
    sql`SELECT COUNT(*) AS c FROM monitored_skins WHERE active = 1`,
    sql`SELECT COUNT(*) AS c FROM price_snapshots`,
    sql`SELECT COUNT(*) AS c FROM transactions`,
    sql`SELECT COUNT(*) AS c FROM pump_scores WHERE pump_probability >= 70 AND timestamp >= ${oneDayAgo}`,
    sql`SELECT MAX(timestamp) AS t FROM pump_scores`,
  ]);

  res.json({
    totalSkins: Number(skinsRow.c),
    totalSnapshots: Number(snapsRow.c),
    totalTransactions: Number(txRow.c),
    alertsToday: Number(alertRow.c),
    lastRunAt: lastRunRow.t ? new Date(Number(lastRunRow.t) * 1000).toISOString() : null,
  });
}
