CREATE TABLE IF NOT EXISTS public.pricing_cache (
  normalized_query text PRIMARY KEY,
  raw_query text NOT NULL,
  product jsonb NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0
);
