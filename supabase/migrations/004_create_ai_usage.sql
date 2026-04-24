CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id text,
  ip_hash text,
  free_credits_used int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_anonymous_id_idx
ON public.ai_usage (anonymous_id)
WHERE anonymous_id IS NOT NULL;
