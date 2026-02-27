import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllMonitoredSkins, refreshSkinData } from '../_lib/marketData';
import { runFullAnalysis } from '../_lib/pumpDetection';
import { sql } from '../_lib/db';
import axios from 'axios';

const WEBHOOK_URL = process.env.WEBHOOK_URL ?? '';
const PUMP_THRESHOLD = 70;

async function triggerWebhook(skinId: string, skinName: string, pumpProbability: number) {
  const payload = {
    event: 'pump_alert',
    skin_id: skinId,
    skin_name: skinName,
    pump_probability: pumpProbability,
    triggered_at: new Date().toISOString(),
    message: `CS2 Pump Alert: ${skinName} has a pump probability of ${pumpProbability.toFixed(1)}%`,
  };

  await sql`
    INSERT INTO webhook_log (skin_id, pump_probability, triggered_at, payload)
    VALUES (${skinId}, ${pumpProbability}, ${Math.floor(Date.now() / 1000)}, ${JSON.stringify(payload)})
  `;

  if (WEBHOOK_URL) {
    await axios.post(WEBHOOK_URL, payload, { timeout: 10000 }).catch(console.error);
  }
}

export async function runAnalysisPipeline() {
  const skins = await getAllMonitoredSkins();
  for (const skin of skins) {
    try {
      await refreshSkinData(skin.id, skin.name);
      const result = await runFullAnalysis(skin.id);
      if (result && result.pumpProbability >= PUMP_THRESHOLD) {
        await triggerWebhook(skin.id, skin.name, result.pumpProbability);
      }
    } catch (err) {
      console.error(`Error processing ${skin.name}:`, err);
    }
  }
  return skins.length;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Respond immediately, run pipeline async
    res.json({ message: 'Pipeline started' });
    runAnalysisPipeline().catch(console.error);
  } catch {
    res.status(500).json({ error: 'Failed to start pipeline' });
  }
}
