import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CountryPricing, Product } from "@/types";
import { COUNTRY_CODES } from "@/types";
import { BasePricingEngine } from "./base";

const VALID_STOCK_STATUSES = new Set<NonNullable<CountryPricing["stockStatus"]>>([
  "in_stock",
  "out_of_stock",
  "preorder",
  "unknown",
]);

/**
 * Gemini-based pricing engine using Google's Generative AI API.
 */
export class GeminiPricingEngine extends BasePricingEngine {
  private readonly genAI: GoogleGenerativeAI;
  private readonly models = [
    "gemini-3.0-flash",      // Best & Fresh Quota
    "gemini-3.5-flash",      // Best & Fresh Quota
    "gemini-2.5-flash-lite", // Backup: Fast & Fresh Quota
    "gemini-2.5-flash",      // Fallback
  ] as const;

  constructor(apiKey: string) {
    super();
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async resolveProductPricing(
    query: string
  ): Promise<{ product: Product; prompt: string } | { error: string; prompt: string } | null> {
    const prompt = this.buildPrompt(query);
    this.log("Starting product resolution", { query });

    for (const modelName of this.models) {
      try {
        this.log("Attempting model", { model: modelName, query });
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const genResult = await model.generateContent(prompt);
        const text = genResult.response.text();

        if (!text) {
          this.warn(`Model returned empty response`, {
            model: modelName,
            query,
          });
          continue;
        }

        this.log("Model succeeded", { model: modelName, query });

        // Parse and validate response
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const parsedResult = this.parseProductResponse(parsed, query);

        if (!parsedResult) {
          this.warn("Failed to parse product from response", {
            model: modelName,
            query,
          });
          continue;
        }

        if ("error" in parsedResult) {
          return { error: parsedResult.error, prompt };
        }

        return { product: parsedResult.product, prompt };
      } catch (err) {
        this.error(
          `Model ${modelName} failed during API call or parsing`,
          err instanceof Error ? err : new Error(String(err))
        );
        // Continue to next model
      }
    }

    this.error("All Gemini models exhausted", "No models succeeded");
    return null;
  }

  private buildPrompt(query: string): string {
    return `You are a Precision Pricing Engine. Your goal is strict "Apples-to-Apples" comparison across 10 global regions.

USER QUERY: "${query}"

### PHASE 1: SANITY CHECK & INTENT RECOGNITION
1. Analyze the query. Is it a valid commercial product or a clear product intent?
2. If the query is gibberish (e.g. "asdf"), random text, or a non-physical concept (e.g. "love", "mathematics"), return an error response.
3. Vague intent queries (e.g. "best camera for YouTube") ARE valid. Select the single best mainstream product and proceed.

### PHASE 2: BASELINE DEFINITION (If valid)
1. If the query is vague or generic (e.g., "MacBook"), select the most popular current-generation base model.
2. Define a strict Baseline Configuration (Model, Storage, RAM, Color if relevant).

### PHASE 3: PRICING EXTRACTION RULES
- Condition: NEW items only. No Refurbished/Used.
- Strict Matching: Search for the Baseline Configuration.
- Fallback Logic: If the EXACT config is unavailable in a region, choose the next closest superior config and note the difference in "notes". Do NOT select an inferior model.
- Currency: Return the RAW local currency number (e.g., 148000 for JPY). Do NOT convert.
- Links: If you cannot find a direct verified product link, construct a high-quality Search Result URL for that specific store. Do not hallucinate deep links.

### REGIONAL SOURCES (Prioritize these):
* US: Amazon.com, Apple.com, Best Buy
* UK: Amazon.co.uk, Apple.co.uk, John Lewis
* IN: Amazon.in, Flipkart, Apple India
* AE: Noon.com, Amazon.ae, Carrefour
* CN: JD.com, Tmall (provide search page if login required)
* KR: Coupang, Samsung Korea, LG Korea
* JP: Amazon.co.jp, Rakuten, BIC Camera
* DE: Amazon.de, MediaMarkt, Currys
* AU: JB Hi-Fi, Harvey Norman, Amazon.au
* HK: Aeon.com.hk, Fortress, Watsons Electronics

### OUTPUT FORMAT (Strict JSON, No Markdown)
If Invalid:
{
  "status": "error",
  "message": "Query appears to be gibberish or not a specific product."
}

If Valid:
{
  "status": "success",
  "id": "kebab-case-product-name",
  "name": "Full product name",
  "displayName": "Clear UI Name (e.g. Sony A7 IV Body Only)",
  "category": "tech" | "vehicle" | "other",
  "carryOnFriendly": true or false,
  "baselineConfiguration": "Full specs used for comparison",
  "is_vague_query": true or false,
  "selection_rationale": "Short reason for selection if vague (optional)",
  "pricing": {
    "US": {
      "price": number or null,
      "currency": "USD",
      "priceSource": "e.g. Apple.com",
      "buyingLink": "https://...",
      "stockStatus": "in_stock" | "out_of_stock" | "preorder" | "unknown",
      "notes": ""
    }
    // ... repeat for all regions
  }
}
`; 
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

      this.log("Successfully parsed product response", {
        productName: product.displayName,
        query,
      });

      return { product };
    } catch (err) {
      this.error(
        "Failed to parse product response",
        err instanceof Error ? err : new Error(String(err))
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
