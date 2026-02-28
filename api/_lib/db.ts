import { sql } from '@vercel/postgres';

export { sql };

let initialized = false;

export async function ensureDb(): Promise<void> {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS skins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      weapon_type TEXT NOT NULL DEFAULT '',
      exterior TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS price_snapshots (
      id SERIAL PRIMARY KEY,
      skin_id TEXT NOT NULL REFERENCES skins(id),
      timestamp BIGINT NOT NULL,
      csfloat_price DOUBLE PRECISION NOT NULL DEFAULT 0,
      csfloat_volume INTEGER NOT NULL DEFAULT 0,
      eastern_price DOUBLE PRECISION NOT NULL DEFAULT 0,
      eastern_volume INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_price_snapshots_skin_time
    ON price_snapshots(skin_id, timestamp)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pump_scores (
      id SERIAL PRIMARY KEY,
      skin_id TEXT NOT NULL REFERENCES skins(id),
      timestamp BIGINT NOT NULL,
      divergence_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      clustering_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      pump_probability DOUBLE PRECISION NOT NULL DEFAULT 0,
      western_volume_growth DOUBLE PRECISION,
      eastern_volume_growth DOUBLE PRECISION,
      top_buyer_concentration DOUBLE PRECISION,
      unique_buyers INTEGER
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_pump_scores_skin_time
    ON pump_scores(skin_id, timestamp)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      skin_id TEXT NOT NULL REFERENCES skins(id),
      buyer_id TEXT,
      seller_id TEXT,
      price DOUBLE PRECISION,
      timestamp BIGINT,
      marketplace TEXT DEFAULT 'csfloat'
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_transactions_skin_time
    ON transactions(skin_id, timestamp)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS webhook_log (
      id SERIAL PRIMARY KEY,
      skin_id TEXT NOT NULL,
      pump_probability DOUBLE PRECISION NOT NULL,
      triggered_at BIGINT NOT NULL,
      payload TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS monitored_skins (
      skin_id TEXT PRIMARY KEY,
      added_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
      active INTEGER NOT NULL DEFAULT 1
    )
  `;

  initialized = true;
}
