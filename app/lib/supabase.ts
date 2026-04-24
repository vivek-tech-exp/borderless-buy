import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use the publishable key for client-side operations. Keep service role key server-only.
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "placeholder-publishable-key";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export function getSupabaseConfigError(): string {
  return "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in and synced wishlists.";
}

/** Supabase client for browser/server. Use in API routes or Server Components. */
export const supabase = createClient(
  supabaseUrl ?? FALLBACK_SUPABASE_URL,
  supabasePublishableKey ?? FALLBACK_SUPABASE_PUBLISHABLE_KEY
);
