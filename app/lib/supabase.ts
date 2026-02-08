import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Supabase client for browser/server. Use in API routes or Server Components. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
