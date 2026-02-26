import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/cs2_pump.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const { mkdirSync } = require('fs');
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS skins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      weapon_type TEXT,
      exterior TEXT,
      image_url TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS price_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skin_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      csfloat_price REAL,
      csfloat_volume INTEGER,
      eastern_price REAL,
      eastern_volume INTEGER,
      FOREIGN KEY (skin_id) REFERENCES skins(id)
    );

    CREATE INDEX IF NOT EXISTS idx_price_snapshots_skin_time
      ON price_snapshots(skin_id, timestamp);

    CREATE TABLE IF NOT EXISTS pump_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skin_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      divergence_score REAL NOT NULL,
      clustering_score REAL NOT NULL,
      pump_probability REAL NOT NULL,
      western_volume_growth REAL,
      eastern_volume_growth REAL,
      top_buyer_concentration REAL,
      unique_buyers INTEGER,
      FOREIGN KEY (skin_id) REFERENCES skins(id)
    );

    CREATE INDEX IF NOT EXISTS idx_pump_scores_skin_time
      ON pump_scores(skin_id, timestamp);

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      skin_id TEXT NOT NULL,
      buyer_id TEXT,
      seller_id TEXT,
      price REAL,
      timestamp INTEGER,
      marketplace TEXT DEFAULT 'csfloat',
      FOREIGN KEY (skin_id) REFERENCES skins(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_skin_time
      ON transactions(skin_id, timestamp);

    CREATE TABLE IF NOT EXISTS webhook_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skin_id TEXT NOT NULL,
      pump_probability REAL NOT NULL,
      triggered_at INTEGER NOT NULL,
      payload TEXT
    );

    CREATE TABLE IF NOT EXISTS monitored_skins (
      skin_id TEXT PRIMARY KEY,
      added_at INTEGER DEFAULT (strftime('%s','now')),
      active INTEGER DEFAULT 1
    );
  `);
}
