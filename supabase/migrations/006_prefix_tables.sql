-- Migration: Prefix all tables with 'onedaybaby_'
-- Created at: 2026-05-01

-- 1. Rename tables
ALTER TABLE IF EXISTS public.wishlist RENAME TO onedaybaby_wishlist;
ALTER TABLE IF EXISTS public.pricing_cache RENAME TO onedaybaby_pricing_cache;
ALTER TABLE IF EXISTS public.ai_usage RENAME TO onedaybaby_ai_usage;
ALTER TABLE IF EXISTS public.ai_request_logs RENAME TO onedaybaby_ai_request_logs;

-- 2. Update the consume_ai_free_credit function to use the new table name
CREATE OR REPLACE FUNCTION public.consume_ai_free_credit(
  p_anonymous_id text,
  p_ip_hash text,
  p_max_credits int DEFAULT 2
)
RETURNS TABLE (
  allowed boolean,
  free_credits_used int,
  free_credits_remaining int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_used int;
BEGIN
  IF p_anonymous_id IS NULL OR length(trim(p_anonymous_id)) = 0 THEN
    RAISE EXCEPTION 'anonymous_id is required'
      USING errcode = '22023';
  END IF;

  -- Use new table name: onedaybaby_ai_usage
  INSERT INTO public.onedaybaby_ai_usage (anonymous_id, ip_hash, free_credits_used, updated_at)
  VALUES (p_anonymous_id, p_ip_hash, 0, now())
  ON CONFLICT (anonymous_id) WHERE anonymous_id IS NOT NULL
  DO NOTHING;

  UPDATE public.onedaybaby_ai_usage
  SET
    free_credits_used = public.onedaybaby_ai_usage.free_credits_used + 1,
    ip_hash = p_ip_hash,
    updated_at = now()
  WHERE public.onedaybaby_ai_usage.anonymous_id = p_anonymous_id
    AND public.onedaybaby_ai_usage.free_credits_used < p_max_credits
  RETURNING public.onedaybaby_ai_usage.free_credits_used INTO v_used;

  IF v_used IS NULL THEN
    SELECT public.onedaybaby_ai_usage.free_credits_used
    INTO v_used
    FROM public.onedaybaby_ai_usage
    WHERE public.onedaybaby_ai_usage.anonymous_id = p_anonymous_id;

    RETURN QUERY SELECT
      false,
      coalesce(v_used, p_max_credits),
      greatest(p_max_credits - coalesce(v_used, p_max_credits), 0);
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true,
    v_used,
    greatest(p_max_credits - v_used, 0);
END;
$$;
