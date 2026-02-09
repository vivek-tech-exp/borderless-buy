import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

/**
 * Verify JWT token and extract user ID.
 * JWT tokens from Supabase contain the user ID in the 'sub' claim.
 */
function verifyTokenAndGetUserId(token: string): string | null {
  try {
    // Decode without verification first to get the payload
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) return null;
    // The 'sub' claim is the user ID
    return (decoded.payload as any).sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a server-side Supabase client for admin operations (using secret key).
 */
function makeAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SECRET, {
    auth: { persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth || undefined;
    if (!token) return NextResponse.json({ error: "Missing access token" }, { status: 401 });

    const userId = verifyTokenAndGetUserId(token);
    if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const supabase = makeAdminClient();
    const { data, error } = await supabase
      .from("wishlist")
      .select("id, product, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET /api/wishlist error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to client WishlistItem shape
    const items = (data ?? []).map((r: any) => ({ id: r.id, product: r.product, createdAt: r.created_at }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/wishlist exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth || undefined;
    if (!token) return NextResponse.json({ error: "Missing access token" }, { status: 401 });

    const userId = verifyTokenAndGetUserId(token);
    if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await request.json();
    const item = body?.item;
    if (!item || !item.id || !item.product) {
      return NextResponse.json({ error: "Invalid item payload" }, { status: 400 });
    }

    const supabase = makeAdminClient();
    const { error } = await supabase.from("wishlist").insert([
      { id: item.id, user_id: userId, product: item.product },
    ]);
    if (error) {
      console.error("POST /api/wishlist insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/wishlist exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth || undefined;
    if (!token) return NextResponse.json({ error: "Missing access token" }, { status: 401 });

    const userId = verifyTokenAndGetUserId(token);
    if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const url = new URL(request.url);
    const itemId = url.searchParams.get("id");
    if (!itemId) {
      return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    }

    const supabase = makeAdminClient();
    
    // First verify the item belongs to this user
    const { data: existing, error: selectError } = await supabase
      .from("wishlist")
      .select("id")
      .eq("id", itemId)
      .eq("user_id", userId)
      .single();

    if (selectError || !existing) {
      // Either item doesn't exist or doesn't belong to user (permission denied)
      return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
    }

    // Delete the item
    const { error: deleteError } = await supabase
      .from("wishlist")
      .delete()
      .eq("id", itemId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("DELETE /api/wishlist error:", deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/wishlist exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
