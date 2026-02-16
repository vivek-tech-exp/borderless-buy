import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import type { WishlistItem } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

type WishlistRow = {
  id: string;
  product: WishlistItem["product"];
  tag: string | null;
  created_at: string;
};

type WishlistPostBody = {
  item?: {
    id?: string;
    product?: WishlistItem["product"];
    tag?: string | null;
  };
};

type WishlistPatchBody = {
  id?: string;
  tag?: string | null;
};

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")?.trim() ?? "";
  if (!authHeader) return null;
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;
}

function extractUserIdFromToken(token: string): string | null {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string") return null;
  return typeof decoded.sub === "string" ? decoded.sub : null;
}

function getAuthorizedUserId(request: NextRequest): { userId: string } | { response: NextResponse } {
  const token = extractBearerToken(request);
  if (!token) return { response: errorResponse("Missing access token", 401) };

  const userId = extractUserIdFromToken(token);
  if (!userId) return { response: errorResponse("Invalid token", 401) };

  return { userId };
}

function sanitizeTag(tag: string | null | undefined): string | null {
  if (typeof tag !== "string") return null;
  const trimmed = tag.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function parseJsonBody<T>(request: NextRequest): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function makeAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SECRET) {
    throw new Error("Missing Supabase configuration");
  }
  return createClient(SUPABASE_URL, SUPABASE_SECRET, {
    auth: { persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  const auth = getAuthorizedUserId(request);
  if ("response" in auth) return auth.response;

  try {
    const supabase = makeAdminClient();
    const { data, error } = await supabase
      .from("wishlist")
      .select("id, product, tag, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET /api/wishlist error:", error.message);
      return errorResponse(error.message, 500);
    }

    const rows = (data ?? []) as WishlistRow[];
    const items: WishlistItem[] = rows.map((row) => ({
      id: row.id,
      product: row.product,
      tag: row.tag ?? undefined,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/wishlist exception:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = getAuthorizedUserId(request);
  if ("response" in auth) return auth.response;

  try {
    const body = await parseJsonBody<WishlistPostBody>(request);
    const item = body?.item;
    if (!item || typeof item.id !== "string" || !item.product) {
      return errorResponse("Invalid item payload", 400);
    }

    const supabase = makeAdminClient();
    const { error } = await supabase.from("wishlist").insert([
      {
        id: item.id,
        user_id: auth.userId,
        product: item.product,
        tag: sanitizeTag(item.tag),
      },
    ]);

    if (error) {
      console.error("POST /api/wishlist error:", error.message);
      return errorResponse(error.message, 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/wishlist exception:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = getAuthorizedUserId(request);
  if ("response" in auth) return auth.response;

  try {
    const itemId = new URL(request.url).searchParams.get("id")?.trim();
    if (!itemId) {
      return errorResponse("Missing item id", 400);
    }

    const supabase = makeAdminClient();
    const { data: existing, error: selectError } = await supabase
      .from("wishlist")
      .select("id")
      .eq("id", itemId)
      .eq("user_id", auth.userId)
      .single();

    if (selectError || !existing) {
      return errorResponse("Item not found or unauthorized", 404);
    }

    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("id", itemId)
      .eq("user_id", auth.userId);

    if (error) {
      console.error("DELETE /api/wishlist error:", error.message);
      return errorResponse(error.message, 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/wishlist exception:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = getAuthorizedUserId(request);
  if ("response" in auth) return auth.response;

  try {
    const body = await parseJsonBody<WishlistPatchBody>(request);
    const itemId = body?.id?.trim();
    if (!itemId) {
      return errorResponse("Missing item id", 400);
    }

    const supabase = makeAdminClient();
    const { error } = await supabase
      .from("wishlist")
      .update({ tag: sanitizeTag(body?.tag) })
      .eq("id", itemId)
      .eq("user_id", auth.userId);

    if (error) {
      console.error("PATCH /api/wishlist error:", error.message);
      return errorResponse(error.message, 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/wishlist exception:", error);
    return errorResponse("Internal server error", 500);
  }
}
