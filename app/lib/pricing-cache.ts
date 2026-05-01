import { createClient } from "@supabase/supabase-js";
import { createLogger } from "@/app/lib/logger";
import type { Product } from "@/types";

const logger = createLogger("PricingCache");

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_FALLBACK_MS = 30 * 24 * 60 * 60 * 1000;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseSecret =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";

export const isPricingCacheConfigured = Boolean(supabaseUrl && supabaseSecret);

type PricingCacheRow = {
  normalized_query: string;
  raw_query: string;
  product: Product;
  model: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  hit_count: number;
};

export type PricingCacheHit = {
  product: Product;
  model: string;
  ageSeconds: number;
  expiresAt: string;
};

export type PricingCacheLookup = {
  fresh: PricingCacheHit | null;
  stale: PricingCacheHit | null;
};

let pricingCacheClient:
  | ReturnType<typeof createClient<any>>
  | null = null;

function getPricingCacheClient() {
  if (!isPricingCacheConfigured) {
    return null;
  }

  pricingCacheClient ??= createClient<any>(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false },
  });
  return pricingCacheClient;
}

function mapCacheHit(row: PricingCacheRow): PricingCacheHit {
  const ageMs = Math.max(Date.now() - new Date(row.updated_at).getTime(), 0);
  return {
    product: row.product,
    model: row.model,
    ageSeconds: Math.floor(ageMs / 1000),
    expiresAt: row.expires_at,
  };
}

async function bumpCacheHitCount(normalizedQuery: string, currentCount: number) {
  const client = getPricingCacheClient();
  if (!client) {
    return;
  }

  const { error } = await client
    .from("onedaybaby_pricing_cache")
    .update({
      hit_count: currentCount + 1,
    })
    .eq("normalized_query", normalizedQuery);

  if (error) {
    logger.warn("Failed to increment pricing cache hit count", {
      normalizedQuery,
      message: error.message,
    });
  }
}

export async function getPricingCacheEntry(normalizedQuery: string): Promise<PricingCacheLookup> {
  const client = getPricingCacheClient();
  if (!client || !normalizedQuery) {
    return { fresh: null, stale: null };
  }

  const { data, error } = await client
    .from("onedaybaby_pricing_cache")
    .select("normalized_query, raw_query, product, model, created_at, updated_at, expires_at, hit_count")
    .eq("normalized_query", normalizedQuery)
    .maybeSingle();

  if (error) {
    logger.warn("Pricing cache lookup failed", {
      normalizedQuery,
      message: error.message,
    });
    return { fresh: null, stale: null };
  }

  if (!data) {
    return { fresh: null, stale: null };
  }

  const row = data as PricingCacheRow;
  const now = Date.now();
  const expiresAt = new Date(row.expires_at).getTime();
  const updatedAt = new Date(row.updated_at).getTime();
  const fresh = Number.isFinite(expiresAt) && expiresAt > now ? mapCacheHit(row) : null;
  const stale =
    Number.isFinite(updatedAt) && now - updatedAt <= STALE_FALLBACK_MS ? mapCacheHit(row) : null;

  if (fresh || stale) {
    await bumpCacheHitCount(normalizedQuery, row.hit_count);
  }

  return { fresh, stale };
}

export async function upsertPricingCacheEntry(params: {
  normalizedQuery: string;
  rawQuery: string;
  product: Product;
  model: string;
}): Promise<PricingCacheHit | null> {
  const client = getPricingCacheClient();
  if (!client) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

  const { data, error: upsertError } = await client
    .from("onedaybaby_pricing_cache")
    .upsert(
      {
        normalized_query: params.normalizedQuery,
        raw_query: params.rawQuery,
        product: params.product,
        model: params.model,
        updated_at: nowIso,
        expires_at: expiresAt,
      },
      {
        onConflict: "normalized_query",
      }
    )
    .select("normalized_query, raw_query, product, model, created_at, updated_at, expires_at, hit_count")
    .maybeSingle();

  if (upsertError) {
    logger.warn("Pricing cache upsert failed", {
      normalizedQuery: params.normalizedQuery,
      message: upsertError.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return mapCacheHit(data as PricingCacheRow);
}
