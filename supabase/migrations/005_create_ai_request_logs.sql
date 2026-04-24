CREATE TABLE IF NOT EXISTS public.ai_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id text,
  provider text NOT NULL,
  model text,
  used_platform_key boolean NOT NULL DEFAULT false,
  used_user_key boolean NOT NULL DEFAULT false,
  cache_hit boolean NOT NULL DEFAULT false,
  success boolean NOT NULL,
  error_code text,
  latency_ms int,
  normalized_product_name text,
  created_at timestamptz DEFAULT now()
);
