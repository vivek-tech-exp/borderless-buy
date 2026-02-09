import { NextRequest, NextResponse } from "next/server";
import { getPricingEngine } from "@/app/lib/pricing-engine";
import type { WishlistItem } from "@/types";

/**
 * POST /api/add-item
 * 
 * Receives a product query and returns a WishlistItem with pricing for all supported countries.
 * Uses the configured pricing engine (Gemini, OpenAI, Perplexity, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    if (!query) {
      return NextResponse.json(
        { error: "Missing or invalid 'query' (e.g. 'MacBook')" },
        { status: 400 }
      );
    }

    // Get the configured pricing engine
    const pricingEngine = getPricingEngine();

    // Resolve product pricing using the engine
    const result = await pricingEngine.resolveProductPricing(query);
    if (!result) {
      return NextResponse.json(
        { error: "AI service failed to resolve product. Try again later." },
        { status: 503 }
      );
    }

    const { product, prompt } = result;

    const item: WishlistItem = {
      id: crypto.randomUUID(),
      product,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ item, prompt });
  } catch (err) {
    console.error("add-item API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

