import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optional: Supabase auth can be wired here later (for example, refresh session or protect routes).
 * For now, all routes are public.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
