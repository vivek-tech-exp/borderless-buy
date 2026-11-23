import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLoggedRoute, REQUEST_ID_HEADER, REQUEST_STARTED_HEADER } from "@/app/lib/request-logging";

export function proxy(request: NextRequest) {
  if (!isLoggedRoute(request.nextUrl.pathname, request.method)) return NextResponse.next();

  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, crypto.randomUUID());
  headers.set(REQUEST_STARTED_HEADER, String(Date.now()));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/add-item", "/api/auth/callback", "/api/rates", "/api/wishlist"],
};
