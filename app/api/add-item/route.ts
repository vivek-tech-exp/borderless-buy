import { NextRequest, NextResponse } from "next/server";
import {
  FREE_AI_CREDITS,
  consumeFreeAiCredit,
  getAiUsageSnapshot,
  hashIpAddress,
  logAiRequest,
  sanitizeAnonymousId,
} from "@/app/lib/ai-usage";
import { createLogger } from "@/app/lib/logger";
import { getPricingCacheEntry, type PricingCacheHit } from "@/app/lib/pricing-cache";
import { isMeaningfulProductQuery, normalizeProductQuery } from "@/app/lib/product-query";
import {
  createPricingEngine,
  getConfiguredPricingModel,
  getConfiguredPricingProvider,
  type PricingProviderType,
} from "@/app/lib/pricing-engine";
import type { PricingResult } from "@/app/lib/pricing-engine/base";
import type { WishlistItem } from "@/types";

const logger = createLogger("AddItemRoute");
const GEMINI_PROMPT_DEBUG_ENABLED =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_GEMINI_PROMPT === "1";

type PricingResponseMeta = {
  cacheHit: boolean;
  provider: PricingProviderType;
  usedPlatformKey: boolean;
  usedUserKey: boolean;
  freeCreditsRemaining: number;
  requiresUserKey: boolean;
  lastCheckedAt?: string;
};

function getRequestIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}

function parseUserGeminiApiKey(body: Record<string, unknown>): string | null {
  const value = body.userGeminiApiKey ?? body.geminiApiKey;
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createWishlistItem(product: WishlistItem["product"]): WishlistItem {
  return {
    id: crypto.randomUUID(),
    product,
    createdAt: new Date().toISOString(),
  };
}

function lastCheckedAtFromCache(hit: PricingCacheHit): string {
  return new Date(Date.now() - hit.ageSeconds * 1000).toISOString();
}

function buildMeta(params: {
  cacheHit: boolean;
  provider: PricingProviderType;
  usedPlatformKey: boolean;
  usedUserKey: boolean;
  freeCreditsRemaining: number;
  requiresUserKey?: boolean;
  lastCheckedAt?: string;
}): PricingResponseMeta {
  return {
    cacheHit: params.cacheHit,
    provider: params.provider,
    usedPlatformKey: params.usedPlatformKey,
    usedUserKey: params.usedUserKey,
    freeCreditsRemaining: params.freeCreditsRemaining,
    requiresUserKey: params.requiresUserKey ?? false,
    ...(params.lastCheckedAt ? { lastCheckedAt: params.lastCheckedAt } : {}),
  };
}

async function writeRequestLog(params: {
  anonymousId: string | null;
  provider: PricingProviderType;
  model: string;
  usedPlatformKey: boolean;
  usedUserKey: boolean;
  cacheHit: boolean;
  success: boolean;
  errorCode?: string;
  startedAt: number;
  normalizedProductName?: string;
}) {
  await logAiRequest({
    anonymousId: params.anonymousId,
    provider: params.provider,
    model: params.model,
    usedPlatformKey: params.usedPlatformKey,
    usedUserKey: params.usedUserKey,
    cacheHit: params.cacheHit,
    success: params.success,
    errorCode: params.errorCode,
    latencyMs: Date.now() - params.startedAt,
    normalizedProductName: params.normalizedProductName,
  });
}

function isSuccessfulPricingResult(result: PricingResult | null): result is Extract<PricingResult, { product: WishlistItem["product"] }> {
  return Boolean(result && "product" in result);
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const provider = getConfiguredPricingProvider();
  const model = getConfiguredPricingModel(provider);
  let anonymousId: string | null = null;
  let normalizedQuery = "";

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    anonymousId = sanitizeAnonymousId(body.anonymousId);
    normalizedQuery = normalizeProductQuery(query);
    const ipHash = hashIpAddress(getRequestIp(request));

    logger.info("Received add-item request", {
      query,
      normalizedQuery,
      provider,
      requestId,
    });

    if (!query || !isMeaningfulProductQuery(normalizedQuery)) {
      await writeRequestLog({
        anonymousId,
        provider,
        model,
        usedPlatformKey: false,
        usedUserKey: false,
        cacheHit: false,
        success: false,
        errorCode: "INVALID_QUERY",
        startedAt,
        normalizedProductName: normalizedQuery || undefined,
      });

      return NextResponse.json(
        { error: "Enter a real product name to compare prices." },
        { status: 400 }
      );
    }

    const cached = await getPricingCacheEntry(normalizedQuery);

    if (cached.fresh) {
      const usage = await getAiUsageSnapshot({ anonymousId });
      const item = createWishlistItem(cached.fresh.product);
      const meta = buildMeta({
        cacheHit: true,
        provider,
        usedPlatformKey: false,
        usedUserKey: false,
        freeCreditsRemaining: usage.freeCreditsRemaining,
        lastCheckedAt: lastCheckedAtFromCache(cached.fresh),
      });

      await writeRequestLog({
        anonymousId,
        provider,
        model: cached.fresh.model,
        usedPlatformKey: false,
        usedUserKey: false,
        cacheHit: true,
        success: true,
        startedAt,
        normalizedProductName: normalizedQuery,
      });

      return NextResponse.json({ item, meta });
    }

    const userGeminiApiKey = parseUserGeminiApiKey(body);
    const usage = await getAiUsageSnapshot({ anonymousId });
    const freeQuotaRemaining = usage.freeCreditsRemaining;
    const shouldUseMock = provider === "mock";
    const shouldUseUserKey = provider === "gemini" && Boolean(userGeminiApiKey);
    const shouldUsePlatformKey = provider === "gemini" && !shouldUseUserKey;

    if (shouldUsePlatformKey && !anonymousId) {
      await writeRequestLog({
        anonymousId,
        provider,
        model,
        usedPlatformKey: false,
        usedUserKey: false,
        cacheHit: false,
        success: false,
        errorCode: "ANONYMOUS_ID_REQUIRED",
        startedAt,
        normalizedProductName: normalizedQuery,
      });

      return NextResponse.json(
        {
          error: "ANONYMOUS_ID_REQUIRED",
          message: "Anonymous usage tracking is required for free platform AI searches.",
          meta: buildMeta({
            cacheHit: false,
            provider,
            usedPlatformKey: false,
            usedUserKey: false,
            freeCreditsRemaining: freeQuotaRemaining,
          }),
        },
        { status: 400 }
      );
    }

    if (provider === "gemini" && shouldUsePlatformKey && !process.env.GEMINI_API_KEY) {
      await writeRequestLog({
        anonymousId,
        provider,
        model,
        usedPlatformKey: false,
        usedUserKey: false,
        cacheHit: false,
        success: false,
        errorCode: "GEMINI_API_KEY_MISSING",
        startedAt,
        normalizedProductName: normalizedQuery,
      });

      return NextResponse.json(
        {
          error: "AI provider is not configured. Set GEMINI_API_KEY or use AI_PROVIDER=mock.",
        },
        { status: 503 }
      );
    }

    const consumedCredit = shouldUsePlatformKey
      ? await consumeFreeAiCredit({ anonymousId, ipHash })
      : null;

    if (consumedCredit && !consumedCredit.allowed) {
      await writeRequestLog({
        anonymousId,
        provider,
        model,
        usedPlatformKey: false,
        usedUserKey: false,
        cacheHit: false,
        success: false,
        errorCode: "FREE_QUOTA_EXHAUSTED",
        startedAt,
        normalizedProductName: normalizedQuery,
      });

      return NextResponse.json(
        {
          error: "FREE_QUOTA_EXHAUSTED",
          message:
            "You have used your 2 free AI searches. Add your Gemini API key to continue.",
          requiresUserKey: true,
          meta: buildMeta({
            cacheHit: false,
            provider,
            usedPlatformKey: false,
            usedUserKey: false,
            freeCreditsRemaining: consumedCredit.freeCreditsRemaining,
            requiresUserKey: true,
          }),
        },
        { status: 429 }
      );
    }

    const pricingEngine = createPricingEngine(provider, {
      apiKey: shouldUseUserKey ? userGeminiApiKey ?? undefined : process.env.GEMINI_API_KEY,
      cacheMode: "write-only",
    });

    logger.debug("Resolving product pricing", {
      query,
      normalizedQuery,
      provider,
      requestId,
    });

    const result = await pricingEngine.resolveProductPricing(query);

    if (!isSuccessfulPricingResult(result)) {
      if (cached.stale) {
        const item = createWishlistItem(cached.stale.product);
        const meta = buildMeta({
          cacheHit: true,
          provider,
          usedPlatformKey: shouldUsePlatformKey,
          usedUserKey: shouldUseUserKey,
          freeCreditsRemaining: consumedCredit?.freeCreditsRemaining ?? freeQuotaRemaining,
          lastCheckedAt: lastCheckedAtFromCache(cached.stale),
        });

        await writeRequestLog({
          anonymousId,
          provider,
          model: cached.stale.model,
          usedPlatformKey: shouldUsePlatformKey,
          usedUserKey: shouldUseUserKey,
          cacheHit: true,
          success: true,
          startedAt,
          normalizedProductName: normalizedQuery,
        });

        return NextResponse.json({ item, meta });
      }

      const errorMessage =
        result && "error" in result
          ? result.error || "Product not found. Try a more specific name."
          : "AI service failed to resolve product. Try again later.";
      const status = result && "error" in result ? 404 : 503;

      await writeRequestLog({
        anonymousId,
        provider,
        model,
        usedPlatformKey: shouldUsePlatformKey,
        usedUserKey: shouldUseUserKey,
        cacheHit: false,
        success: false,
        errorCode: status === 404 ? "PRODUCT_NOT_FOUND" : "AI_SERVICE_FAILED",
        startedAt,
        normalizedProductName: normalizedQuery,
      });

      return NextResponse.json({ error: errorMessage }, { status });
    }

    const finalUsage = consumedCredit ?? {
      freeCreditsUsed: FREE_AI_CREDITS - freeQuotaRemaining,
      freeCreditsRemaining: shouldUseMock ? FREE_AI_CREDITS : freeQuotaRemaining,
    };

    const item = createWishlistItem(result.product);
    const meta = buildMeta({
      cacheHit: result.source === "cache" || result.source === "stale_cache",
      provider,
      usedPlatformKey: shouldUsePlatformKey,
      usedUserKey: shouldUseUserKey,
      freeCreditsRemaining: finalUsage.freeCreditsRemaining,
      lastCheckedAt:
        result.source === "cache" || result.source === "stale_cache"
          ? new Date(Date.now() - (result.cacheAgeSeconds ?? 0) * 1000).toISOString()
          : new Date().toISOString(),
    });

    logger.info("Successfully added item", {
      productName: result.product.displayName,
      normalizedQuery: result.normalizedQuery,
      source: result.source,
      provider,
      model: result.model,
      cacheAgeSeconds: result.cacheAgeSeconds,
      requestId,
    });

    await writeRequestLog({
      anonymousId,
      provider,
      model: result.model ?? model,
      usedPlatformKey: shouldUsePlatformKey,
      usedUserKey: shouldUseUserKey,
      cacheHit: meta.cacheHit,
      success: true,
      startedAt,
      normalizedProductName: result.normalizedQuery,
    });

    return NextResponse.json({
      item,
      meta,
      ...(GEMINI_PROMPT_DEBUG_ENABLED && result.prompt ? { prompt: result.prompt } : {}),
    });
  } catch (err) {
    logger.error(
      "add-item API error",
      err instanceof Error ? err : new Error(String(err)),
      { requestId }
    );

    await writeRequestLog({
      anonymousId,
      provider,
      model,
      usedPlatformKey: false,
      usedUserKey: false,
      cacheHit: false,
      success: false,
      errorCode: "INTERNAL_SERVER_ERROR",
      startedAt,
      normalizedProductName: normalizedQuery || undefined,
    });

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
