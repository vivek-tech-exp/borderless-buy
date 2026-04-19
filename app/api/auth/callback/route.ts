import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/app/lib/supabase";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(requestUrl.origin);
  }

  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error("Error exchanging code for session:", error);
    }
  }

  // Redirect to home page after successful authentication
  return NextResponse.redirect(requestUrl.origin);
}
