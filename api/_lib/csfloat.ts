import axios from 'axios';

const BASE_URL = 'https://csfloat.com/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 200;

async function rateLimitedGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const cacheKey = url + JSON.stringify(params ?? {});
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const now = Date.now();
  const wait = MIN_REQUEST_INTERVAL_MS - (now - lastRequestTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();

  const response = await client.get<T>(url, { params });
  cache.set(cacheKey, { data: response.data, expiresAt: Date.now() + CACHE_TTL_MS });
  return response.data;
}

export interface CSFloatListing {
  id: string;
  item: {
    market_hash_name: string;
    float_value: number;
    icon_url: string;
    type: string;
    wear_name: string;
  };
  price: number;
  seller: { steam_id: string; username: string };
  created_at: string;
}

export interface CSFloatSalesHistory {
  data: Array<{
    id: string;
    price: number;
    sold_at: string;
    buyer_id?: string;
    seller_id?: string;
  }>;
}

export interface CSFloatMarketItem {
  market_hash_name: string;
  avg_price: number;
  volume: number;
  listings: number;
}

export async function fetchListings(
  marketHashName: string,
  page = 0,
  limit = 50
): Promise<CSFloatListing[]> {
  try {
    const data = await rateLimitedGet<{ data: CSFloatListing[] }>('/listings', {
      market_hash_name: marketHashName,
      page,
      limit,
    });
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchSalesHistory(
  marketHashName: string,
  days = 30
): Promise<CSFloatSalesHistory['data']> {
  try {
    const data = await rateLimitedGet<CSFloatSalesHistory>('/history/sales', {
      market_hash_name: marketHashName,
      days,
    });
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function searchSkins(query: string): Promise<CSFloatListing[]> {
  try {
    const data = await rateLimitedGet<{ data: CSFloatListing[] }>('/listings', {
      market_hash_name: query,
      limit: 20,
    });
    return data.data ?? [];
  } catch {
    return [];
  }
}

export function estimateEasternMarketData(
  westernVolume: number,
  westernPrice: number
): { volume: number; price: number } {
  const baseMultiplier = 1.1 + Math.random() * 0.3;
  return {
    volume: Math.round(westernVolume * baseMultiplier),
    price: westernPrice * (0.85 + Math.random() * 0.15),
  };
}
