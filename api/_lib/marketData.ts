import { sql, ensureDb } from './db';
import { fetchListings, fetchSalesHistory, estimateEasternMarketData, CSFloatListing } from './csfloat';

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
  await ensureDb();
  await sql`
    INSERT INTO skins (id, name, weapon_type, exterior, image_url)
    VALUES (${skin.id}, ${skin.name}, ${skin.weaponType}, ${skin.exterior}, ${skin.imageUrl})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      weapon_type = EXCLUDED.weapon_type,
      exterior = EXCLUDED.exterior,
      image_url = EXCLUDED.image_url
  `;
}

export async function saveSnapshot(snapshot: SkinSnapshot): Promise<void> {
  await ensureDb();
  await sql`
    INSERT INTO price_snapshots
      (skin_id, timestamp, csfloat_price, csfloat_volume, eastern_price, eastern_volume)
    VALUES (
      ${snapshot.skinId},
      ${snapshot.timestamp},
      ${snapshot.csFloatPrice},
      ${snapshot.csFloatVolume},
      ${snapshot.easternPrice},
      ${snapshot.easternVolume}
    )
  `;
}

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  await ensureDb();
  for (const tx of transactions) {
    await sql`
      INSERT INTO transactions (id, skin_id, buyer_id, seller_id, price, timestamp)
      VALUES (${tx.id}, ${tx.skinId}, ${tx.buyerId}, ${tx.sellerId}, ${tx.price}, ${tx.timestamp})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function getSnapshots(
  skinId: string,
  days: number
): Promise<Array<{
  timestamp: number;
  csfloat_price: number;
  csfloat_volume: number;
  eastern_price: number;
  eastern_volume: number;
}>> {
  await ensureDb();
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  const { rows } = await sql`
    SELECT timestamp, csfloat_price, csfloat_volume, eastern_price, eastern_volume
    FROM price_snapshots
    WHERE skin_id = ${skinId} AND timestamp >= ${cutoff}
    ORDER BY timestamp ASC
  `;
  return rows as ReturnType<typeof getSnapshots> extends Promise<infer T> ? T : never;
}

export async function getRecentTransactions(
  skinId: string,
  days = 30
): Promise<Array<{
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  price: number;
  timestamp: number;
}>> {
  await ensureDb();
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  const { rows } = await sql`
    SELECT id, buyer_id, seller_id, price, timestamp
    FROM transactions
    WHERE skin_id = ${skinId} AND timestamp >= ${cutoff}
    ORDER BY timestamp DESC
  `;
  return rows as ReturnType<typeof getRecentTransactions> extends Promise<infer T> ? T : never;
}

export async function getAllMonitoredSkins(): Promise<SkinRecord[]> {
  await ensureDb();
  const { rows } = await sql`
    SELECT s.id, s.name, s.weapon_type, s.exterior, s.image_url
    FROM skins s
    INNER JOIN monitored_skins ms ON s.id = ms.skin_id
    WHERE ms.active = 1
  `;
  return rows as SkinRecord[];
}

export async function addMonitoredSkin(skinId: string): Promise<void> {
  await ensureDb();
  await sql`
    INSERT INTO monitored_skins (skin_id) VALUES (${skinId})
    ON CONFLICT (skin_id) DO UPDATE SET active = 1
  `;
}

export async function removeMonitoredSkin(skinId: string): Promise<void> {
  await ensureDb();
  await sql`UPDATE monitored_skins SET active = 0 WHERE skin_id = ${skinId}`;
}

export async function refreshSkinData(skinId: string, skinName: string): Promise<SkinSnapshot | null> {
  const listings = await fetchListings(skinName, 0, 100);
  if (listings.length === 0) return null;

  const firstListing: CSFloatListing = listings[0];
  const avgPrice = listings.reduce((sum, l) => sum + l.price, 0) / listings.length / 100;

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

  await upsertSkin({
    id: skinId,
    name: skinName,
    weaponType: firstListing.item.type ?? 'Unknown',
    exterior: firstListing.item.wear_name ?? 'Unknown',
    imageUrl: firstListing.item.icon_url ?? '',
  });

  await saveSnapshot(snapshot);

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
