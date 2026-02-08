import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Use the publishable key for client-side operations. Keep service role key server-only.
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Supabase client for browser/server. Use in API routes or Server Components. */
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
