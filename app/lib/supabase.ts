import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use the publishable key for client-side operations. Keep service role key server-only.
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "placeholder-publishable-key";
const AUTH_CALLBACK_PATH = "/api/auth/callback";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export function getSupabaseConfigError(): string {
  return "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in and synced wishlists.";
}

export function createSupabaseAuthClient() {
  if (!supabaseUrl || !supabasePublishableKey) return null;

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

function getMagicLinkAccessToken() {
  const hash = globalThis.location?.hash;
  if (!hash) return null;

  const fragment = new URLSearchParams(hash.slice(1));
  const type = fragment.get("type");
  return type === "magiclink" || type === "signup" ? fragment.get("access_token") : null;
}

// Supabase removes the fragment during initialization. Match the resulting session to this link.
let magicLinkAccessToken = getMagicLinkAccessToken();

export function confirmMagicLinkSignIn(accessToken: string) {
  if (accessToken !== magicLinkAccessToken) return;
  magicLinkAccessToken = null;

  void fetch(AUTH_CALLBACK_PATH, {
    method: "POST",
    mode: "same-origin",
    credentials: "omit",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {
    // The session is already established. Confirmation is best-effort telemetry.
  });
}

/** Supabase client for browser/server. Use in API routes or Server Components. */
export const supabase = createClient(
  supabaseUrl ?? FALLBACK_SUPABASE_URL,
  supabasePublishableKey ?? FALLBACK_SUPABASE_PUBLISHABLE_KEY
);
