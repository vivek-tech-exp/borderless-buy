import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import { getPricingCacheEntry, upsertPricingCacheEntry } from "@/app/lib/pricing-cache";
import { isMeaningfulProductQuery, normalizeProductQuery } from "@/app/lib/product-query";
import type { CountryPricing, Product } from "@/types";
import { COUNTRY_CODES } from "@/types";
import { BasePricingEngine, type PricingResult } from "./base";

const VALID_STOCK_STATUSES = new Set<NonNullable<CountryPricing["stockStatus"]>>([
  "in_stock",
  "out_of_stock",
  "preorder",
  "unknown",
]);

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_PROMPT_DEBUG_ENABLED =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_GEMINI_PROMPT === "1";
const GEMINI_TOKEN_BUDGET = 1800;

const SYSTEM_INSTRUCTION = [
  "You normalize a shopping query into one product and compare new-item pricing across 10 markets.",
  "Use only current mainstream retail listings and return strict JSON.",
  "If the query is gibberish, non-commercial, or too vague to resolve to one real product, return status=error.",
  "For vague but valid shopping intent, choose one mainstream current-generation product and explain briefly in selection_rationale.",
  "Match a single baseline configuration consistently across all markets.",
  "If an exact match is unavailable in a market, choose the nearest superior variant, never an inferior one, and note the difference in notes.",
  "Return raw local prices only. Do not convert currency.",
  "Prefer direct retailer links. If none exists, use a strong retailer search results URL for that market.",
  "Keep notes empty unless a variant mismatch, stock caveat, or link limitation matters.",
].join(" ");

const COUNTRY_PRICING_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    price: {
      type: SchemaType.NUMBER,
      nullable: true,
    },
    currency: { type: SchemaType.STRING },
    priceSource: { type: SchemaType.STRING },
    buyingLink: { type: SchemaType.STRING },
    stockStatus: {
      type: SchemaType.STRING,
      enum: ["in_stock", "out_of_stock", "preorder", "unknown"],
    },
    notes: { type: SchemaType.STRING },
  },
  required: ["price", "currency", "priceSource", "buyingLink", "stockStatus", "notes"],
};

const GEMINI_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    status: {
      type: SchemaType.STRING,
      enum: ["success", "error"],
    },
    message: { type: SchemaType.STRING },
    id: { type: SchemaType.STRING },
    name: { type: SchemaType.STRING },
    displayName: { type: SchemaType.STRING },
    category: {
      type: SchemaType.STRING,
      enum: ["tech", "vehicle", "other"],
    },
    carryOnFriendly: { type: SchemaType.BOOLEAN },
    baselineConfiguration: { type: SchemaType.STRING },
    is_vague_query: { type: SchemaType.BOOLEAN },
    selection_rationale: { type: SchemaType.STRING },
    pricing: {
      type: SchemaType.OBJECT,
      properties: {
        US: COUNTRY_PRICING_SCHEMA,
        UK: COUNTRY_PRICING_SCHEMA,
        IN: COUNTRY_PRICING_SCHEMA,
        AE: COUNTRY_PRICING_SCHEMA,
        CN: COUNTRY_PRICING_SCHEMA,
        KR: COUNTRY_PRICING_SCHEMA,
        JP: COUNTRY_PRICING_SCHEMA,
        DE: COUNTRY_PRICING_SCHEMA,
        AU: COUNTRY_PRICING_SCHEMA,
        HK: COUNTRY_PRICING_SCHEMA,
      },
      required: [...COUNTRY_CODES],
    },
  },
  required: ["status"],
};

function buildUserPrompt(normalizedQuery: string): string {
  return [
    `Query: "${normalizedQuery}"`,
    "Markets: US, UK, IN, AE, CN, KR, JP, DE, AU, HK.",
    "Output only JSON matching the schema.",
  ].join("\n");
}

function buildDebugPrompt(systemInstruction: string, userPrompt: string): string {
  return `System:\n${systemInstruction}\n\nUser:\n${userPrompt}`;
}

function looksLikeRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("429") || lowered.includes("resource_exhausted") || lowered.includes("rate limit");
}

/**
 * Gemini-based pricing engine using Google's Generative AI API.
 */
export class GeminiPricingEngine extends BasePricingEngine {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(apiKey: string, modelName = DEFAULT_GEMINI_MODEL) {
    super();
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async performResolveProductPricing(query: string): Promise<PricingResult | null> {
    const normalizedQuery = normalizeProductQuery(query);

    if (!isMeaningfulProductQuery(normalizedQuery)) {
      return {
        error: "Enter a real product name to compare prices.",
        normalizedQuery,
      };
    }

    const cached = await getPricingCacheEntry(normalizedQuery);
    if (cached.fresh) {
      this.log("Serving pricing from fresh cache", {
        normalizedQuery,
        model: cached.fresh.model,
        cacheAgeSeconds: cached.fresh.ageSeconds,
      });
      return {
        product: cached.fresh.product,
        normalizedQuery,
        model: cached.fresh.model,
        source: "cache",
        cacheAgeSeconds: cached.fresh.ageSeconds,
      };
    }

    const userPrompt = buildUserPrompt(normalizedQuery);
    const prompt = GEMINI_PROMPT_DEBUG_ENABLED
      ? buildDebugPrompt(SYSTEM_INSTRUCTION, userPrompt)
      : undefined;

    this.log("Starting Gemini product resolution", {
      query,
      normalizedQuery,
      model: this.modelName,
    });

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
          temperature: 0,
          candidateCount: 1,
          maxOutputTokens: 2200,
        },
      });

      await this.logPromptBudget(model, userPrompt, normalizedQuery);

      const genResult = await model.generateContent(userPrompt);
      const text = genResult.response.text();

      if (!text) {
        this.warn("Gemini returned an empty response", {
          normalizedQuery,
          model: this.modelName,
        });
        return this.useStaleCacheOrNull({
          cached,
          normalizedQuery,
          prompt,
        });
      }

      const parsed = JSON.parse(text) as Record<string, unknown>;
      const parsedResult = this.parseProductResponse(parsed, normalizedQuery);

      if (!parsedResult) {
        this.warn("Gemini response could not be parsed into a product", {
          normalizedQuery,
          model: this.modelName,
        });
        return this.useStaleCacheOrNull({
          cached,
          normalizedQuery,
          prompt,
        });
      }

      if ("error" in parsedResult) {
        return {
          error: parsedResult.error,
          normalizedQuery,
          model: this.modelName,
          prompt,
        };
      }

      const cachedProduct = await upsertPricingCacheEntry({
        normalizedQuery,
        rawQuery: query.trim(),
        product: parsedResult.product,
        model: this.modelName,
      });

      return {
        product: cachedProduct?.product ?? parsedResult.product,
        normalizedQuery,
        model: cachedProduct?.model ?? this.modelName,
        source: "fresh_ai",
        cacheAgeSeconds: cachedProduct?.ageSeconds ?? 0,
        prompt,
      };
    } catch (error) {
      this.error(
        `Gemini model ${this.modelName} failed during API call or parsing`,
        error instanceof Error ? error : new Error(String(error))
      );

      if (cached.stale && looksLikeRateLimitError(error)) {
        return {
          product: cached.stale.product,
          normalizedQuery,
          model: cached.stale.model,
          source: "stale_cache",
          cacheAgeSeconds: cached.stale.ageSeconds,
          prompt,
        };
      }

      if (cached.stale) {
        return {
          product: cached.stale.product,
          normalizedQuery,
          model: cached.stale.model,
          source: "stale_cache",
          cacheAgeSeconds: cached.stale.ageSeconds,
          prompt,
        };
      }

      return null;
    }
  }

  private async logPromptBudget(
    model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
    userPrompt: string,
    normalizedQuery: string
  ) {
    if (!GEMINI_PROMPT_DEBUG_ENABLED) {
      return;
    }

    try {
      const tokenCount = await model.countTokens({
        generateContentRequest: {
          systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        },
      });

      if (tokenCount.totalTokens > GEMINI_TOKEN_BUDGET) {
        this.warn("Gemini prompt budget exceeded", {
          normalizedQuery,
          tokenCount: tokenCount.totalTokens,
          tokenBudget: GEMINI_TOKEN_BUDGET,
        });
      }
    } catch (error) {
      this.warn("Gemini token budget check failed", {
        normalizedQuery,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private useStaleCacheOrNull(params: {
    cached: Awaited<ReturnType<typeof getPricingCacheEntry>>;
    normalizedQuery: string;
    prompt?: string;
  }): PricingResult | null {
    if (!params.cached.stale) {
      return null;
    }

    return {
      product: params.cached.stale.product,
      normalizedQuery: params.normalizedQuery,
      model: params.cached.stale.model,
      source: "stale_cache",
      cacheAgeSeconds: params.cached.stale.ageSeconds,
      prompt: params.prompt,
    };
  }

  private parseProductResponse(
    parsed: Record<string, unknown>,
    query: string
  ): { product: Product } | { error: string } | null {
    try {
      const errorResult = this.parseErrorResult(parsed);
      if (errorResult) {
        return errorResult;
      }

      const pricing = this.parsePricing(parsed.pricing);
      if (!this.hasAnyPrice(pricing)) {
        return { error: "No reliable prices found. Try a more specific product." };
      }

      const product = this.buildProduct(parsed, query, pricing);

      this.log("Successfully parsed Gemini pricing response", {
        productName: product.displayName,
        query,
      });

      return { product };
    } catch (error) {
      this.error(
        "Failed to parse Gemini product response",
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  private parseErrorResult(parsed: Record<string, unknown>): { error: string } | null {
    if (parsed.status !== "error") {
      return null;
    }

    const message =
      typeof parsed.message === "string" && parsed.message.trim().length > 0
        ? parsed.message
        : "Query is not a valid product.";
    return { error: message };
  }

  private parsePricing(pricingRaw: unknown): Product["pricing"] {
    const pricing: Product["pricing"] = {};
    if (!pricingRaw || typeof pricingRaw !== "object") {
      return pricing;
    }

    const pricingMap = pricingRaw as Record<string, unknown>;
    for (const code of COUNTRY_CODES) {
      const parsedEntry = this.parsePricingEntry(pricingMap[code]);
      if (parsedEntry) {
        pricing[code] = parsedEntry;
      }
    }
    return pricing;
  }

  private parsePricingEntry(rawEntry: unknown): CountryPricing | null {
    if (!rawEntry || typeof rawEntry !== "object") {
      return null;
    }

    const entry = rawEntry as Record<string, unknown>;
    if (typeof entry.currency !== "string" || typeof entry.priceSource !== "string") {
      return null;
    }

    const price = this.isValidPrice(entry.price) ? entry.price : null;
    const buyingLink = this.isValidUrl(entry.buyingLink) ? String(entry.buyingLink) : "";
    const notesValue = typeof entry.notes === "string" ? entry.notes : "";
    const variantDiff = typeof entry.variant_diff === "string" ? entry.variant_diff : "";

    return {
      price,
      currency: entry.currency,
      priceSource: entry.priceSource,
      buyingLink,
      stockStatus: this.parseStockStatus(entry.stockStatus),
      notes: notesValue || variantDiff || "",
    };
  }

  private parseStockStatus(value: unknown): NonNullable<CountryPricing["stockStatus"]> {
    return VALID_STOCK_STATUSES.has(value as NonNullable<CountryPricing["stockStatus"]>)
      ? (value as NonNullable<CountryPricing["stockStatus"]>)
      : "unknown";
  }

  private hasAnyPrice(pricing: Product["pricing"]): boolean {
    return Object.values(pricing).some((entry) => typeof entry?.price === "number");
  }

  private parseCategory(value: unknown): Product["category"] {
    return value === "tech" || value === "vehicle" || value === "other" ? value : "other";
  }

  private parseOptionalString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
  }

  private parseNonEmptyString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
  }

  private parseProductId(value: unknown): string {
    return this.parseNonEmptyString(value) ?? crypto.randomUUID();
  }

  private parseProductName(value: unknown, fallback: string): string {
    return this.parseNonEmptyString(value) ?? fallback;
  }

  private parseDisplayName(displayName: unknown, name: unknown, fallback: string): string {
    return this.parseNonEmptyString(displayName) ?? this.parseProductName(name, fallback);
  }

  private buildProduct(
    parsed: Record<string, unknown>,
    query: string,
    pricing: Product["pricing"]
  ): Product {
    return {
      id: this.parseProductId(parsed.id),
      name: this.parseProductName(parsed.name, query),
      displayName: this.parseDisplayName(parsed.displayName, parsed.name, query),
      category: this.parseCategory(parsed.category),
      carryOnFriendly: Boolean(parsed.carryOnFriendly),
      baselineConfiguration: this.parseOptionalString(parsed.baselineConfiguration),
      isVagueQuery: Boolean(parsed.is_vague_query),
      selectionRationale: this.parseOptionalString(parsed.selection_rationale),
      pricing,
    };
  }
}
