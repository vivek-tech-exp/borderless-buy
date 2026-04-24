import { NextRequest, NextResponse } from "next/server";
import { getPricingEngine } from "@/app/lib/pricing-engine";
import { createLogger } from "@/app/lib/logger";
import type { WishlistItem } from "@/types";

const logger = createLogger("AddItemRoute");
const GEMINI_PROMPT_DEBUG_ENABLED =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_GEMINI_PROMPT === "1";

/**
 * POST /api/add-item
 * 
 * Receives a product query and returns a WishlistItem with pricing for all supported countries.
 * Uses the configured pricing engine (Gemini, OpenAI, Perplexity, etc.)
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    
    logger.info("Received add-item request", {
      query,
      requestId,
    });
    
    if (!query) {
      logger.warn("Invalid request: missing query", { requestId });
      return NextResponse.json(
        { error: "Missing or invalid 'query' (e.g. 'MacBook')" },
        { status: 400 }
      );
    }

    // Get the configured pricing engine
    const pricingEngine = getPricingEngine();

    // Resolve product pricing using the engine
    logger.debug("Resolving product pricing", {
      query,
      requestId,
    });

    const result = await pricingEngine.resolveProductPricing(query);
    
    if (!result) {
      logger.error("Pricing engine failed to resolve product", "No valid result returned", {
        query,
        requestId,
      });
      return NextResponse.json(
        { error: "AI service failed to resolve product. Try again later." },
        { status: 503 }
      );
    }

    if ("error" in result) {
      logger.warn("Pricing engine returned invalid query", {
        query,
        normalizedQuery: result.normalizedQuery,
        requestId,
        message: result.error,
        model: result.model,
      });
      return NextResponse.json(
        { error: result.error || "Product not found. Try a more specific name." },
        { status: 404 }
      );
    }

    const { product, prompt } = result;

    const item: WishlistItem = {
      id: crypto.randomUUID(),
      product,
      createdAt: new Date().toISOString(),
    };

    logger.info("Successfully added item", {
      productName: product.displayName,
      normalizedQuery: result.normalizedQuery,
      source: result.source,
      model: result.model,
      cacheAgeSeconds: result.cacheAgeSeconds,
      requestId,
    });

    return NextResponse.json({
      item,
      ...(GEMINI_PROMPT_DEBUG_ENABLED && prompt ? { prompt } : {}),
    });
  } catch (err) {
    logger.error(
      "add-item API error",
      err instanceof Error ? err : new Error(String(err)),
      { requestId }
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
