import { getDb } from '../database/schema';
import {
  fetchListings,
  fetchSalesHistory,
  estimateEasternMarketData,
  CSFloatListing,
} from './csfloat';

export interface SkinSnapshot {
  skinId: string;
  name: string;
  timestamp: number;
  csFloatPrice: number;
  csFloatVolume: number;
  easternPrice: number;
  easternVolume: number;
}

export interface SkinRecord {
  id: string;
  name: string;
  weapon_type: string;
  exterior: string;
  image_url: string;
}

export interface Transaction {
  id: string;
  skinId: string;
  buyerId: string | null;
  sellerId: string | null;
  price: number;
  timestamp: number;
}

export async function upsertSkin(skin: {
  id: string;
  name: string;
  weaponType: string;
  exterior: string;
  imageUrl: string;
}): Promise<void> {
  const db = getDb();
  db.prepare(`
    INSERT INTO skins (id, name, weapon_type, exterior, image_url)
    VALUES (@id, @name, @weaponType, @exterior, @imageUrl)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      weapon_type = excluded.weapon_type,
      exterior = excluded.exterior,
      image_url = excluded.image_url
  `).run(skin);
}

export async function saveSnapshot(snapshot: SkinSnapshot): Promise<void> {
  const db = getDb();
  db.prepare(`
    INSERT INTO price_snapshots
      (skin_id, timestamp, csfloat_price, csfloat_volume, eastern_price, eastern_volume)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    snapshot.skinId,
    snapshot.timestamp,
    snapshot.csFloatPrice,
    snapshot.csFloatVolume,
    snapshot.easternPrice,
    snapshot.easternVolume
  );
}

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  const db = getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO transactions (id, skin_id, buyer_id, seller_id, price, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((txs: Transaction[]) => {
    for (const tx of txs) {
      insert.run(tx.id, tx.skinId, tx.buyerId, tx.sellerId, tx.price, tx.timestamp);
    }
  });
  insertMany(transactions);
}

export function getSnapshots(
  skinId: string,
  days: number
): Array<{
  timestamp: number;
  csfloat_price: number;
  csfloat_volume: number;
  eastern_price: number;
  eastern_volume: number;
}> {
  const db = getDb();
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  return db
    .prepare(
      `SELECT timestamp, csfloat_price, csfloat_volume, eastern_price, eastern_volume
       FROM price_snapshots
       WHERE skin_id = ? AND timestamp >= ?
       ORDER BY timestamp ASC`
    )
    .all(skinId, cutoff) as ReturnType<typeof getSnapshots>;
}

export function getRecentTransactions(
  skinId: string,
  days = 30
): Array<{
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  price: number;
  timestamp: number;
}> {
  const db = getDb();
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  return db
    .prepare(
      `SELECT id, buyer_id, seller_id, price, timestamp
       FROM transactions
       WHERE skin_id = ? AND timestamp >= ?
       ORDER BY timestamp DESC`
    )
    .all(skinId, cutoff) as ReturnType<typeof getRecentTransactions>;
}

export function getAllMonitoredSkins(): SkinRecord[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.id, s.name, s.weapon_type, s.exterior, s.image_url
       FROM skins s
       INNER JOIN monitored_skins ms ON s.id = ms.skin_id
       WHERE ms.active = 1`
    )
    .all() as SkinRecord[];
}

export function addMonitoredSkin(skinId: string): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO monitored_skins (skin_id) VALUES (?)`
  ).run(skinId);
}

export function removeMonitoredSkin(skinId: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE monitored_skins SET active = 0 WHERE skin_id = ?`
  ).run(skinId);
}

// Fetch fresh data for a skin and persist it
export async function refreshSkinData(skinId: string, skinName: string): Promise<SkinSnapshot | null> {
  const listings = await fetchListings(skinName, 0, 100);
  if (listings.length === 0) return null;

  const firstListing: CSFloatListing = listings[0];
  const avgPrice =
    listings.reduce((sum, l) => sum + l.price, 0) / listings.length / 100; // prices in cents

  const salesHistory = await fetchSalesHistory(skinName, 30);
  const westernVolume = salesHistory.length;

  const eastern = estimateEasternMarketData(westernVolume, avgPrice);

  const snapshot: SkinSnapshot = {
    skinId,
    name: skinName,
    timestamp: Math.floor(Date.now() / 1000),
    csFloatPrice: avgPrice,
    csFloatVolume: westernVolume,
    easternPrice: eastern.price,
    easternVolume: eastern.volume,
  };

  // Upsert skin record
  await upsertSkin({
    id: skinId,
    name: skinName,
    weaponType: firstListing.item.type ?? 'Unknown',
    exterior: firstListing.item.wear_name ?? 'Unknown',
    imageUrl: firstListing.item.icon_url ?? '',
  });

  await saveSnapshot(snapshot);

  // Save transactions
  const transactions: Transaction[] = salesHistory.map(sale => ({
    id: sale.id,
    skinId,
    buyerId: sale.buyer_id ?? null,
    sellerId: sale.seller_id ?? null,
    price: sale.price / 100,
    timestamp: Math.floor(new Date(sale.sold_at).getTime() / 1000),
  }));
  await saveTransactions(transactions);

  return snapshot;
}
