import cron from 'node-cron';
import axios from 'axios';
import { getAllMonitoredSkins } from '../services/marketData';
import { refreshSkinData } from '../services/marketData';
import { runFullAnalysis } from '../services/pumpDetection';
import { getDb } from '../database/schema';

const WEBHOOK_URL = process.env.WEBHOOK_URL ?? '';
const PUMP_THRESHOLD = 70;

async function runAnalysisPipeline(): Promise<void> {
  console.log(`[Scheduler] Starting analysis pipeline at ${new Date().toISOString()}`);
  const skins = getAllMonitoredSkins();

  for (const skin of skins) {
    try {
      console.log(`[Scheduler] Processing skin: ${skin.name}`);
      await refreshSkinData(skin.id, skin.name);
      const result = await runFullAnalysis(skin.id);

      if (result && result.pumpProbability >= PUMP_THRESHOLD) {
        console.log(
          `[Scheduler] ALERT: ${skin.name} pump probability = ${result.pumpProbability.toFixed(1)}`
        );
        await triggerWebhook(skin.id, skin.name, result.pumpProbability);
      }
    } catch (err) {
      console.error(`[Scheduler] Error processing ${skin.name}:`, err);
    }
  }

  console.log(`[Scheduler] Pipeline complete. Processed ${skins.length} skins.`);
}

async function triggerWebhook(
  skinId: string,
  skinName: string,
  pumpProbability: number
): Promise<void> {
  const payload = {
    event: 'pump_alert',
    skin_id: skinId,
    skin_name: skinName,
    pump_probability: pumpProbability,
    triggered_at: new Date().toISOString(),
    message: `CS2 Pump Alert: ${skinName} has a pump probability of ${pumpProbability.toFixed(1)}%`,
  };

  // Log to database
  const db = getDb();
  db.prepare(
    `INSERT INTO webhook_log (skin_id, pump_probability, triggered_at, payload)
     VALUES (?, ?, ?, ?)`
  ).run(skinId, pumpProbability, Math.floor(Date.now() / 1000), JSON.stringify(payload));

  if (!WEBHOOK_URL) return;

  try {
    await axios.post(WEBHOOK_URL, payload, { timeout: 10000 });
    console.log(`[Webhook] Sent alert for ${skinName}`);
  } catch (err) {
    console.error(`[Webhook] Failed to send alert for ${skinName}:`, err);
  }
}

export function startScheduler(): void {
  // Run every 6 hours: 0 */6 * * *
  cron.schedule('0 */6 * * *', async () => {
    await runAnalysisPipeline();
  });

  console.log('[Scheduler] Cron job registered: every 6 hours');

  // Run once on startup after a short delay
  setTimeout(() => {
    runAnalysisPipeline().catch(err => {
      console.error('[Scheduler] Startup run failed:', err);
    });
  }, 5000);
}

export { runAnalysisPipeline };
