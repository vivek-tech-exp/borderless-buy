import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/app/lib/supabase";
import { withRequestLogging } from "@/app/lib/request-logging";

const MAX_SIGN_IN_AGE_SECONDS = 5 * 60;

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const supabase = code ? createSupabaseAuthClient() : null;

  if (code && supabase) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      console.error("Failed to exchange auth callback code");
    }
  }

  return NextResponse.redirect(requestUrl.origin);
}

async function confirmSignIn(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return new Response(null, { status: 403 });
  }

  const accessToken = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!accessToken) return new Response(null, { status: 401 });

  const supabase = createSupabaseAuthClient();
  if (!supabase) return new Response(null, { status: 503 });

  const { data, error } = await supabase.auth.getClaims(accessToken);
  if (error?.status === 0 || (error?.status ?? 0) >= 500) {
    return new Response(null, { status: 503 });
  }

  const now = Math.floor(Date.now() / 1_000);
  const claims = data?.claims;
  const recentOtp = claims?.amr?.some((entry) => typeof entry !== "string"
    && entry.method === "otp"
    && entry.timestamp >= now - MAX_SIGN_IN_AGE_SECONDS
    && entry.timestamp <= now);
  if (claims?.role !== "authenticated" || claims.is_anonymous || !claims.sub || !recentOtp) {
    return new Response(null, { status: 401 });
  }

  return new Response(null, { status: 204 });
}

export const POST = withRequestLogging("/api/auth/callback", confirmSignIn, "auth.sign_in_succeeded");
