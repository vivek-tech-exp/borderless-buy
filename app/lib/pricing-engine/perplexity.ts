import { normalizeProductQuery } from "@/app/lib/product-query";
import { BasePricingEngine, type PricingResult } from "./base";

/**
 * Perplexity-based pricing engine (using Perplexity's API)
 * Ready for integration.
 */
export class PerplexityPricingEngine extends BasePricingEngine {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super();
    if (!apiKey) {
      throw new Error("Perplexity API key is required");
    }
    this.apiKey = apiKey;
  }

  async performResolveProductPricing(
    query: string
  ): Promise<PricingResult | null> {
    this.error("Perplexity engine not yet implemented. Please use Gemini or OpenAI.");
    this.log("Perplexity engine stub invoked", {
      query,
      hasApiKey: this.apiKey.length > 0,
    });
    return {
      error: "Perplexity pricing engine is not implemented. Use Gemini instead.",
      normalizedQuery: normalizeProductQuery(query),
    };
  }
}
